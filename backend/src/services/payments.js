import { db } from '../db.js';
import { getAllSettings } from '../settings.js';
import { getPaymentDriver } from '../payments/index.js';
import { buildReceipt } from '../payments/yookassa.js';

/**
 * Создать онлайн-платёж для заказа и вернуть ссылку на оплату (confirmation_url).
 * Заказ переводится в payment_status='pending'. В POS/MAX он НЕ уходит — это
 * произойдёт после подтверждения оплаты (обязательная предоплата).
 *
 * Об оплате мы узнаём двумя независимыми путями:
 *  1) вебхук ЮKassa (ЛК → Интеграция → HTTP-уведомления) — основной в проде;
 *  2) активная сверка при опросе статуса заказа (см. refreshOrderPayment) —
 *     работает и локально, где вебхук физически не может дойти, и страхует
 *     прод от недошедших/ненастроенных уведомлений.
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
 * Применить авторитетный статус платежа (полученный от ЮKassa по API) к заказу.
 * UPDATE с условием payment_status='pending' — атомарный замок: вебхук и
 * активная сверка могут сработать одновременно, но финализирует заказ
 * (POS + уведомление MAX) только тот, чей UPDATE прошёл первым.
 */
async function applyPaymentResult(orderId, payment) {
  if (payment.status === 'succeeded' && payment.paid) {
    const won = await db('orders')
      .where({ id: orderId, payment_status: 'pending' })
      .update({
        payment_status: 'paid',
        payment_method: payment.method,
        paid_at: db.fn.now(),
        updated_at: db.fn.now(),
      });
    if (won) {
      const { finalizeOrder } = await import('./orders.js');
      await finalizeOrder(orderId);
    }
  } else if (payment.status === 'canceled') {
    await db('orders')
      .where({ id: orderId, payment_status: 'pending' })
      .update({ payment_status: 'canceled', updated_at: db.fn.now() });
  }
}

/**
 * Обработка вебхука ЮKassa. Телу вебхука НЕ доверяем — перезапрашиваем платёж
 * по id авторитетно и только тогда меняем статус заказа. Идемпотентно.
 */
export async function handleYooKassaWebhook(body) {
  const event = body?.event;
  const paymentId = body?.object?.id;
  if (!paymentId || (event !== 'payment.succeeded' && event !== 'payment.canceled')) return;

  const driver = await getPaymentDriver(await getAllSettings());
  if (!driver) return;

  const payment = await driver.getPayment(paymentId);
  const orderId = Number(payment.metadata?.order_id);
  if (!orderId) return;

  await applyPaymentResult(orderId, payment);
}

/**
 * Активная сверка: если заказ ждёт оплату — спросить ЮKassa о платеже напрямую
 * и применить результат. Вызывается из публичного эндпоинта статуса заказа
 * (страница «Ожидаем оплату» опрашивает его каждые несколько секунд).
 * Ошибки ЮKassa не роняют эндпоинт — заказ просто остаётся pending до
 * следующей попытки. Возвращает актуальную строку заказа.
 */
export async function refreshOrderPayment(order) {
  if (order.payment_status !== 'pending' || !order.payment_id) return order;
  try {
    const driver = await getPaymentDriver();
    if (!driver) return order;
    const payment = await driver.getPayment(order.payment_id);
    await applyPaymentResult(order.id, payment);
  } catch (e) {
    console.error('YooKassa refresh:', e.message);
    return order;
  }
  return db('orders').where({ id: order.id }).first();
}
