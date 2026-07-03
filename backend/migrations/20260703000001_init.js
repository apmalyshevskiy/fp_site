export async function up(knex) {
  await knex.schema.createTable('settings', (t) => {
    t.string('key', 100).primary();
    t.text('value');
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('admin_users', (t) => {
    t.increments('id');
    t.string('email', 190).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('categories', (t) => {
    t.increments('id');
    t.string('external_id', 100).unique(); // id категории в FUSIONPOS
    t.string('name', 255).notNullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.boolean('is_visible').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('products', (t) => {
    t.increments('id');
    t.string('external_id', 100).unique(); // id блюда в FUSIONPOS
    t.integer('category_id').unsigned().references('categories.id').onDelete('SET NULL');
    t.string('name', 255).notNullable();
    t.text('description');
    t.decimal('price', 10, 2).notNullable().defaultTo(0);
    t.string('image_url', 500); // локальный оверрайд, не затирается синком
    t.boolean('is_visible').notNullable().defaultTo(true); // локальный оверрайд
    t.boolean('is_available').notNullable().defaultTo(true); // приходит из POS (стоп-лист)
    t.integer('sort_order').notNullable().defaultTo(0);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('orders', (t) => {
    t.increments('id');
    t.string('public_id', 21).notNullable().unique(); // номер заказа для клиента
    t.enum('type', ['pickup', 'delivery']).notNullable();
    t.string('customer_name', 255).notNullable();
    t.string('customer_phone', 50).notNullable();
    t.string('address', 500);
    t.text('comment');
    t.decimal('items_total', 10, 2).notNullable();
    t.decimal('delivery_fee', 10, 2).notNullable().defaultTo(0);
    t.decimal('total', 10, 2).notNullable();
    t.enum('status', ['new', 'accepted', 'done', 'cancelled']).notNullable().defaultTo('new');
    // Статус отправки заказа во FUSIONPOS
    t.enum('pos_status', ['pending', 'sent', 'error']).notNullable().defaultTo('pending');
    t.string('pos_external_id', 100); // id внешнего заказа в POS
    t.text('pos_error');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('order_items', (t) => {
    t.increments('id');
    t.integer('order_id').unsigned().notNullable().references('orders.id').onDelete('CASCADE');
    t.integer('product_id').unsigned().references('products.id').onDelete('SET NULL');
    t.string('external_id', 100); // id блюда в POS на момент заказа
    t.string('name', 255).notNullable(); // снапшот названия
    t.decimal('price', 10, 2).notNullable(); // снапшот цены
    t.integer('qty').notNullable();
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('order_items');
  await knex.schema.dropTableIfExists('orders');
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('categories');
  await knex.schema.dropTableIfExists('admin_users');
  await knex.schema.dropTableIfExists('settings');
}
