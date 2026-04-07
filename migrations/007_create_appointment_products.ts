import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('appointment_products', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('appointment_id').notNullable().references('id').inTable('appointments').onDelete('CASCADE');
    table.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
    table.float('quantity_used').notNullable().defaultTo(1);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('appointment_products');
}
