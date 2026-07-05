// Ручные переопределения полей поверх данных POS. Хранится только то, что
// реально переопределено (сырые ключи = имена колонок); синк из FUSIONPOS
// эту колонку не трогает и продолжает писать сырые значения как раньше —
// эффективное значение (с учётом переопределения) считается на чтении,
// см. backend/src/services/overrides.js.
export async function up(knex) {
  await knex.schema.alterTable('categories', (t) => {
    t.json('field_overrides');
  });
  await knex.schema.alterTable('products', (t) => {
    t.json('field_overrides');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('products', (t) => {
    t.dropColumn('field_overrides');
  });
  await knex.schema.alterTable('categories', (t) => {
    t.dropColumn('field_overrides');
  });
}
