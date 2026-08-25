import type { Knex } from 'knex';

// Self-serve signup: a business gets a free trial when it registers, and keeps full access
// until the trial ends. After that only an active Stripe subscription keeps the doors open.
//
// The trial deadline lives here rather than in Stripe because it starts at signup — before
// the business has ever talked to Stripe or created a customer.
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('businesses', (table) => {
    table.timestamp('trial_ends_at').nullable();
  });

  // Businesses that predate self-serve signup were onboarded by hand; leaving their trial
  // null would lock them out immediately, so grant them the standard window from now.
  await knex('businesses')
    .whereNull('trial_ends_at')
    .update({
      trial_ends_at: knex.raw("now() + interval '14 days'"),
    });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('businesses', (table) => {
    table.dropColumn('trial_ends_at');
  });
}
