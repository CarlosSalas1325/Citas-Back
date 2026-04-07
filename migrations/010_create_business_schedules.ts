import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('business_schedules', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('business_id').notNullable().references('id').inTable('businesses').onDelete('CASCADE');
    table.integer('day_of_week').notNullable(); // 0=Domingo, 1=Lunes ... 6=Sábado
    table.time('open_time').notNullable();
    table.time('close_time').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    table.unique(['business_id', 'day_of_week']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('business_schedules');
}
