import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('portfolio', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('business_id').notNullable().references('id').inTable('businesses').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('title').notNullable();
    table.text('description').nullable();
    table.string('image_url').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('portfolio');
}
