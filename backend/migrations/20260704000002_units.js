export async function up(knex) {
  await knex.schema.alterTable('products', (t) => {
    t.string('unit', 20).notNullable().defaultTo('шт'); // единица измерения
    t.decimal('qty_step', 6, 3).notNullable().defaultTo(1); // шаг количества (0.5 кг и т.п.)
  });
  await knex.schema.alterTable('order_items', (t) => {
    t.decimal('qty', 8, 3).notNullable().alter(); // дробное количество
    t.string('unit', 20).notNullable().defaultTo('шт'); // снапшот единицы на момент заказа
  });
}

export async function down(knex) {
  await knex.schema.alterTable('order_items', (t) => {
    t.integer('qty').notNullable().alter();
    t.dropColumn('unit');
  });
  await knex.schema.alterTable('products', (t) => {
    t.dropColumn('unit');
    t.dropColumn('qty_step');
  });
}
