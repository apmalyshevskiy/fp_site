export async function up(knex) {
  await knex.schema.alterTable('products', (t) => {
    // Весовой товар: количество произвольное (калькулятор), не кратно шагу
    t.boolean('is_weight').notNullable().defaultTo(false);
  });
}

export async function down(knex) {
  await knex.schema.alterTable('products', (t) => {
    t.dropColumn('is_weight');
  });
}
