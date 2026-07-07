// Онлайн-оплата (ЮKassa). Заказ создаётся со статусом оплаты и уходит в POS/MAX
// только после подтверждённой оплаты. Заказы без подключённой оплаты остаются
// с payment_status='not_required' и работают как прежде (оплата при получении).
export async function up(knex) {
  await knex.schema.alterTable('orders', (t) => {
    t.enu('payment_status', ['not_required', 'pending', 'paid', 'canceled'])
      .notNullable()
      .defaultTo('not_required');
    t.string('payment_id', 100); // id платежа в ЮKassa
    t.string('payment_method', 50); // sbp | bank_card | ... (из успешного платежа)
    t.timestamp('paid_at').nullable();
  });
}

export async function down(knex) {
  await knex.schema.alterTable('orders', (t) => {
    t.dropColumn('payment_status');
    t.dropColumn('payment_id');
    t.dropColumn('payment_method');
    t.dropColumn('paid_at');
  });
}
