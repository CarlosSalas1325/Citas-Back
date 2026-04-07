import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('services', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('business_id').notNullable().references('id').inTable('businesses').onDelete('CASCADE');
    table.string('name').notNullable();
    table.text('description').notNullable().defaultTo('');
    table.decimal('price', 10, 2).notNullable();
    table.integer('duration').notNullable(); // minutes
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['business_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('services');
}
