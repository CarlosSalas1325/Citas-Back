import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('service_products', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('service_id').notNullable().references('id').inTable('services').onDelete('CASCADE');
    table.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
    table.float('quantity_used').notNullable().defaultTo(1);

    table.unique(['service_id', 'product_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('service_products');
}
