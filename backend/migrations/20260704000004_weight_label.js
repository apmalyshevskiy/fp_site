export async function up(knex) {
  await knex.schema.alterTable('products', (t) => {
    // Вес/объём порции для показа на карточке («367 г», «0.5 л»)
    t.string('weight_label', 30);
  });
}

export async function down(knex) {
  await knex.schema.alterTable('products', (t) => {
    t.dropColumn('weight_label');
  });
}
