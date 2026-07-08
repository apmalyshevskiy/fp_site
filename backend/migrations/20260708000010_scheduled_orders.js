// Заказ «ко времени»: желаемый момент готовности (самовывоз) или доставки.
// null — «как можно скорее». Абсолютный момент времени (UTC в БД); валидация
// против времени работы ресторана — в services/workHours.js.
export async function up(knex) {
  await knex.schema.alterTable('orders', (t) => {
    t.datetime('scheduled_at').nullable();
  });
}

export async function down(knex) {
  await knex.schema.alterTable('orders', (t) => {
    t.dropColumn('scheduled_at');
  });
}
