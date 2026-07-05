export async function up(knex) {
  await knex.schema.alterTable('categories', (t) => {
    t.string('external_uuid', 100).unique(); // uuid категории в FUSIONPOS
  });
  await knex.schema.alterTable('products', (t) => {
    t.string('external_uuid', 100).unique(); // uuid позиции в FUSIONPOS
    // Из номенклатуры FUSIONPOS (expand=nomenclature)
    t.text('compound'); // состав
    t.text('allergens');
    t.decimal('protein', 6, 2);
    t.decimal('fat', 6, 2);
    t.decimal('carbohydrate', 6, 2);
    t.integer('kilocalories');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('products', (t) => {
    t.dropColumn('external_uuid');
    t.dropColumn('compound');
    t.dropColumn('allergens');
    t.dropColumn('protein');
    t.dropColumn('fat');
    t.dropColumn('carbohydrate');
    t.dropColumn('kilocalories');
  });
  await knex.schema.alterTable('categories', (t) => {
    t.dropColumn('external_uuid');
  });
}
