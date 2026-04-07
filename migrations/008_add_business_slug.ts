import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('businesses', (table) => {
    table.string('slug').unique().nullable();
  });

  // Generate slugs for existing businesses
  const businesses = await knex('businesses').select('id', 'name');
  for (const biz of businesses) {
    const slug = biz.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    await knex('businesses').where({ id: biz.id }).update({ slug });
  }

  // Now make it not nullable
  await knex.schema.alterTable('businesses', (table) => {
    table.string('slug').notNullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('businesses', (table) => {
    table.dropColumn('slug');
  });
}
