import type { Knex } from 'knex';

// On Supabase every table in the `public` schema is published through PostgREST, so a table
// created without RLS is readable by anyone holding the anon/publishable key — which is
// public by design, it ships inside the frontend bundle. The billing tables carry customer
// emails and Stripe customer/subscription ids, so that exposure is not acceptable.
//
// This matches what the rest of the schema already does: RLS on, no policies, which denies
// every PostgREST request. The API connects as the `postgres` role and bypasses RLS, so
// application access is unchanged. On a plain Postgres (local dev, CI) there is no PostgREST
// and this is simply a harmless no-op safeguard.
const TABLES = [
  'pagokit_stripe_customers',
  'pagokit_subscriptions',
  'pagokit_idempotency_keys',
  'pagokit_webhook_events_processed',
];

export async function up(knex: Knex): Promise<void> {
  for (const table of TABLES) {
    await knex.raw(`ALTER TABLE ?? ENABLE ROW LEVEL SECURITY`, [table]);
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const table of TABLES) {
    await knex.raw(`ALTER TABLE ?? DISABLE ROW LEVEL SECURITY`, [table]);
  }
}
