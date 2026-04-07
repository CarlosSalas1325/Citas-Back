import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('business_id').notNullable().references('id').inTable('businesses').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('phone').notNullable();
    table.string('password').notNullable();
    table.string('role').notNullable().defaultTo('CLIENTE').checkIn(['SUPER_ADMIN', 'ADMIN', 'PROFESIONAL', 'RECEPCIONISTA', 'PACIENTE', 'CLIENTE']);
    table.boolean('is_verified').notNullable().defaultTo(false);
    table.string('refresh_token').nullable();
    table.string('otp_code').nullable();
    table.timestamp('otp_expires_at').nullable();
    table.timestamps(true, true);

    table.unique(['business_id', 'phone']);
    table.index(['business_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
}
