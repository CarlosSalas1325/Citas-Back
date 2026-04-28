import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('appointment_products', (table) => {
    table.float('quantity').notNullable().defaultTo(1);
    table.decimal('unit_price', 10, 2).notNullable().defaultTo(0);
  });

  // Migrate existing data: copy quantity_used → quantity
  await knex.raw('UPDATE appointment_products SET quantity = quantity_used');

  await knex.schema.alterTable('appointment_products', (table) => {
    table.dropColumn('quantity_used');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('appointment_products', (table) => {
    table.float('quantity_used').notNullable().defaultTo(1);
  });

  await knex.raw('UPDATE appointment_products SET quantity_used = quantity');

  await knex.schema.alterTable('appointment_products', (table) => {
    table.dropColumn('quantity');
    table.dropColumn('unit_price');
  });
}
