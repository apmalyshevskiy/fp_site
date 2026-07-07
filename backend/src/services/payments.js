import { db } from '../db.js';
import { getAllSettings } from '../settings.js';
import { getPaymentDriver } from '../payments/index.js';
import { buildReceipt } from '../payments/yookassa.js';

/**
 * Создать онлайн-платёж для заказа и вернуть ссылку на оплату (confirmation_url).
 * Заказ переводится в payment_status='pending'. В POS/MAX он НЕ уходит — это
 * произойдёт после подтверждения оплаты в вебхуке (обязательная предоплата).
 */
export async function createPaymentForOrder(order, items, settings, baseUrl) {
  const driver = await getPaymentDriver(settings);
  if (!driver) throw new Error('Онлайн-оплата не настроена');

  const receipt = buildReceipt(
    { items, deliveryFee: order.delivery_fee, phone: order.customer_phone },
    driver.vatCode
  );

  const payment = await driver.createPayment({
    orderId: order.id,
    amount: Number(order.total),
    description: `Заказ №${order.public_id}`,
    returnUrl: `${baseUrl}/order/${order.public_id}`,
    receipt,
  });

  await db('orders').where({ id: order.id }).update({
    payment_id: payment.id,
    payment_status: 'pending',
    updated_at: db.fn.now(),
  });

  return payment.confirmationUrl;
}

/**
 * Обработка вебхука ЮKassa. Телу вебхука НЕ доверяем — перезапрашиваем платёж
 * по id авторитетно и только тогда меняем статус заказа. Идемпотентно: повторные
 * вебхуки об уже оплаченном заказе игнорируются.
 */
export async function handleYooKassaWebhook(body) {
  const event = body?.event;
  const paymentId = body?.object?.id;
  if (!paymentId || (event !== 'payment.succeeded' && event !== 'payment.canceled')) return;

  const settings = await getAllSettings();
  const driver = await getPaymentDriver(settings);
  if (!driver) return;

  const payment = await driver.getPayment(paymentId);
  const orderId = Number(payment.metadata?.order_id);
  if (!orderId) return;
  const order = await db('orders').where({ id: orderId }).first();
  if (!order) return;

  if (payment.status === 'succeeded' && payment.paid) {
    if (order.payment_status === 'paid') return; // уже финализирован
    await db('orders').where({ id: orderId }).update({
      payment_status: 'paid',
      payment_method: payment.method,
      paid_at: db.fn.now(),
      updated_at: db.fn.now(),
    });
    // Оплата подтверждена — теперь отдаём заказ в работу (POS + уведомление MAX).
    const { finalizeOrder } = await import('./orders.js');
    await finalizeOrder(orderId);
  } else if (payment.status === 'canceled' && order.payment_status !== 'paid') {
    await db('orders').where({ id: orderId }).update({
      payment_status: 'canceled',
      updated_at: db.fn.now(),
    });
  }
}
