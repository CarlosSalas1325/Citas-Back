import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('appointments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('business_id').notNullable().references('id').inTable('businesses').onDelete('CASCADE');
    table.uuid('patient_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('professional_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('service_id').notNullable().references('id').inTable('services').onDelete('CASCADE');
    table
      .string('status')
      .notNullable()
      .defaultTo('PENDIENTE')
      .checkIn(['PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA']);
    table.timestamp('date_time').notNullable();
    table.decimal('total_price', 10, 2).notNullable().defaultTo(0);
    table.text('notes').nullable();
    table.timestamps(true, true);

    table.index(['business_id', 'date_time']);
    table.index(['business_id']);
    table.index(['patient_id']);
    table.index(['professional_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('appointments');
}
