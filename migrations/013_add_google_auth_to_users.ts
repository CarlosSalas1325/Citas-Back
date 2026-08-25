import type { Knex } from 'knex';

// Google Sign-In support.
//
// Until now a user was identified by (business_id, phone) and always had a password.
// A Google account gives us an email + a stable Google subject id, but no phone and no
// password, so both of those columns have to become nullable. Phone is still collected
// after the first Google login (see /auth/complete-profile) because the business needs a
// contact channel for appointments — it is "not yet provided", not "never provided".
//
// Uniqueness stays scoped per business: the same person can legitimately be a client of
// several businesses with the same Google account, so google_id/email are unique per
// business, never globally. Postgres treats NULLs as distinct, so the pre-existing
// (business_id, phone) unique constraint keeps working for phone-less Google users.
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.string('email').nullable();
    table.string('google_id').nullable();
    table.string('avatar_url').nullable();
  });

  // Knex cannot drop NOT NULL without rewriting the column definition, so do it in raw SQL
  // to avoid clobbering the existing defaults/checks on those columns.
  await knex.raw('ALTER TABLE users ALTER COLUMN password DROP NOT NULL');
  await knex.raw('ALTER TABLE users ALTER COLUMN phone DROP NOT NULL');

  await knex.raw(
    'CREATE UNIQUE INDEX users_business_google_unique ON users (business_id, google_id) WHERE google_id IS NOT NULL',
  );
  await knex.raw(
    'CREATE UNIQUE INDEX users_business_email_unique ON users (business_id, email) WHERE email IS NOT NULL',
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS users_business_email_unique');
  await knex.raw('DROP INDEX IF EXISTS users_business_google_unique');

  // Rows created through Google have no password/phone; they would violate the restored
  // NOT NULL constraints, so drop them before putting the constraints back.
  await knex('users').whereNull('password').orWhereNull('phone').del();

  await knex.raw('ALTER TABLE users ALTER COLUMN phone SET NOT NULL');
  await knex.raw('ALTER TABLE users ALTER COLUMN password SET NOT NULL');

  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('avatar_url');
    table.dropColumn('google_id');
    table.dropColumn('email');
  });
}
