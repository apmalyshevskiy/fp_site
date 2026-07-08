// Модификаторы позиций: группы опций у товара.
//  - single: ровно один вариант (объём напитка, замена молока) — есть вариант
//    по умолчанию;
//  - multi: любой набор (добавки-сиропы, исключения «без лука»).
// У варианта — доплата к цене (0, положительная или отрицательная).
// Пока настраивается в админке; external_id заложены под будущий синк из
// FUSIONPOS. В заказ модификаторы попадают снапшотом (order_items.modifiers),
// поэтому удаление/переиздание конфига историю заказов не ломает.
export async function up(knex) {
  await knex.schema.createTable('modifier_groups', (t) => {
    t.increments('id');
    t.integer('product_id').unsigned().notNullable()
      .references('products.id').onDelete('CASCADE');
    t.string('external_id', 100); // id группы в FUSIONPOS (на будущее)
    t.string('name', 100).notNullable();
    t.enu('type', ['single', 'multi']).notNullable().defaultTo('multi');
    t.integer('sort_order').notNullable().defaultTo(0);
  });
  await knex.schema.createTable('modifier_options', (t) => {
    t.increments('id');
    t.integer('group_id').unsigned().notNullable()
      .references('modifier_groups.id').onDelete('CASCADE');
    t.string('external_id', 100);
    t.string('name', 100).notNullable();
    t.decimal('price_delta', 10, 2).notNullable().defaultTo(0);
    t.boolean('is_default').notNullable().defaultTo(false);
    t.integer('sort_order').notNullable().defaultTo(0);
  });
  await knex.schema.alterTable('order_items', (t) => {
    t.json('modifiers'); // снапшот выбора: [{ group, name, price }]
  });
}

export async function down(knex) {
  await knex.schema.alterTable('order_items', (t) => {
    t.dropColumn('modifiers');
  });
  await knex.schema.dropTableIfExists('modifier_options');
  await knex.schema.dropTableIfExists('modifier_groups');
}
