import type { Knex } from 'knex';

// PagoKit — platform billing tables (business subscribes to the platform via Stripe).
// Rule 4: idempotency_keys table persisted for merchant-side dedup on retry.
// Rule 9: webhook_events_processed table persisted for webhook replay/dedup by event.id.
// Rule 12: no card_number / cvv / track1 / track2 columns anywhere — Stripe tokenizes.
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('pagokit_stripe_customers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table
      .uuid('business_id')
      .notNullable()
      .unique()
      .references('id')
      .inTable('businesses')
      .onDelete('CASCADE');
    table.string('stripe_customer_id').notNullable().unique();
    table.string('email').notNullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('pagokit_subscriptions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table
      .uuid('business_id')
      .notNullable()
      .references('id')
      .inTable('businesses')
      .onDelete('CASCADE');
    table.string('stripe_subscription_id').notNullable().unique();
    table.string('stripe_price_id').notNullable();
    table
      .string('status')
      .notNullable()
      .checkIn([
        'incomplete',
        'incomplete_expired',
        'trialing',
        'active',
        'past_due',
        'canceled',
        'unpaid',
        'paused',
      ]);
    table.timestamp('current_period_start').nullable();
    table.timestamp('current_period_end').nullable();
    table.timestamp('cancel_at').nullable();
    table.timestamp('canceled_at').nullable();
    table.timestamps(true, true);

    table.index(['business_id']);
  });

  // Rule 4: idempotency keys must be crypto.randomUUID() literals (enforced in application code)
  // and persisted here for merchant-side dedup on retry.
  await knex.schema.createTable('pagokit_idempotency_keys', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('idempotency_key').notNullable().unique();
    table
      .uuid('business_id')
      .nullable()
      .references('id')
      .inTable('businesses')
      .onDelete('SET NULL');
    table.string('endpoint').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // Rule 9: replay protection via event-id dedup (secondary defense alongside the
  // timestamp-window check Stripe already performs inside constructEvent).
  await knex.schema.createTable('pagokit_webhook_events_processed', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('event_id').notNullable().unique();
    table.string('provider').notNullable().defaultTo('stripe');
    table.string('event_type').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable();

    table.index(['expires_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('pagokit_webhook_events_processed');
  await knex.schema.dropTableIfExists('pagokit_idempotency_keys');
  await knex.schema.dropTableIfExists('pagokit_subscriptions');
  await knex.schema.dropTableIfExists('pagokit_stripe_customers');
}
