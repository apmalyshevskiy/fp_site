import { db } from '../db.js';
import { getAllSettings } from '../settings.js';
import { getPosDriver } from '../pos/index.js';
import { notifyNewOrderMax } from '../notifications/max.js';
import { getPaymentDriver } from '../payments/index.js';
import { createPaymentForOrder } from './payments.js';
import { pricingOf } from './overrides.js';
import { getOrderingStatus, closedMessage } from './workHours.js';

/**
 * Создание заказа: валидация → пересчёт сумм по ценам из БД (не доверяем
 * ценам с фронта) → сохранение.
 * Если подключена онлайн-оплата — создаём платёж и возвращаем ссылку на оплату;
 * заказ уходит в POS/MAX только после подтверждения оплаты (см. finalizeOrder,
 * вызывается из вебхука в services/payments.js). Если оплата не подключена —
 * заказ сразу отправляется в POS и уведомление в MAX (оплата при получении).
 */
export async function createOrder(input, { baseUrl } = {}) {
  const settings = await getAllSettings();

  // Время работы: вне расписания (или при ручной паузе) заказы не принимаем
  const ordering = getOrderingStatus(settings);
  if (!ordering.open) throw httpError(400, closedMessage(ordering));

  const type = input.type;
  if (!['pickup', 'delivery'].includes(type)) throw httpError(400, 'Неверный тип заказа');
  if (type === 'pickup' && settings.pickup_enabled !== 'true') throw httpError(400, 'Самовывоз отключён');
  if (type === 'delivery' && settings.delivery_enabled !== 'true') throw httpError(400, 'Доставка отключена');

  const name = String(input.customerName || '').trim();
  const phone = String(input.customerPhone || '').trim();
  if (!name) throw httpError(400, 'Укажите имя');
  if (!/^[\d\s()+-]{7,20}$/.test(phone)) throw httpError(400, 'Укажите корректный телефон');

  const address = type === 'delivery' ? String(input.address || '').trim() : null;
  if (type === 'delivery' && !address) throw httpError(400, 'Укажите адрес доставки');

  const items = Array.isArray(input.items) ? input.items : [];
  if (!items.length) throw httpError(400, 'Корзина пуста');

  const productIds = items.map((i) => Number(i.productId)).filter(Boolean);
  const products = await db('products').whereIn('id', productIds);
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));

  let itemsTotal = 0;
  const orderItems = [];
  for (const item of items) {
    const product = byId[Number(item.productId)];
    const qty = Number(item.qty);
    if (!product) throw httpError(400, 'Некоторые позиции больше недоступны, обновите страницу');
    if (!product.is_visible || !product.is_available) {
      throw httpError(400, `Позиция «${product.name}» сейчас недоступна`);
    }
    // Количество: положительное, не больше 99.
    // Весовой товар — произвольное количество; штучный — кратно шагу позиции.
    const step = Number(product.qty_step) || 1;
    const stepsCount = qty / step;
    const badQty =
      !Number.isFinite(qty) || qty <= 0 || qty > 99 ||
      (!product.is_weight && Math.abs(stepsCount - Math.round(stepsCount)) > 1e-6);
    if (badQty) {
      throw httpError(400, `Неверное количество для позиции «${product.name}»`);
    }
    // Цена — как на витрине: база с учётом ручного переопределения,
    // затем акционная цена, если действует скидка (см. pricingOf).
    const price = pricingOf(product).final;
    itemsTotal += Math.round(price * qty * 100) / 100;
    orderItems.push({
      product_id: product.id,
      external_id: product.external_id,
      name: product.name,
      price,
      qty,
      unit: product.unit || 'шт',
    });
  }
  itemsTotal = Math.round(itemsTotal * 100) / 100;

  const minOrder = Number(settings.delivery_min_order || 0);
  if (type === 'delivery' && itemsTotal < minOrder) {
    throw httpError(400, `Минимальная сумма заказа на доставку — ${minOrder} ₽`);
  }

  let deliveryFee = 0;
  if (type === 'delivery') {
    const fee = Number(settings.delivery_fee || 0);
    const freeFrom = Number(settings.delivery_free_from || 0);
    deliveryFee = freeFrom > 0 && itemsTotal >= freeFrom ? 0 : fee;
  }

  const orderRow = {
    type,
    customer_name: name,
    customer_phone: phone,
    address,
    comment: String(input.comment || '').trim() || null,
    items_total: itemsTotal,
    delivery_fee: deliveryFee,
    total: itemsTotal + deliveryFee,
  };

  const orderId = await db.transaction(async (trx) => {
    // Числовой номер заказа для клиента = автоинкрементный id
    const [id] = await trx('orders').insert({ ...orderRow, public_id: `tmp-${Date.now()}` });
    await trx('orders').where({ id }).update({ public_id: String(id) });
    await trx('order_items').insert(orderItems.map((it) => ({ ...it, order_id: id })));
    return id;
  });

  const order = await db('orders').where({ id: orderId }).first();

  // Онлайн-оплата подключена → обязательная предоплата: создаём платёж и
  // отдаём ссылку. В POS/MAX заказ уйдёт после подтверждения оплаты (вебхук).
  const paymentDriver = await getPaymentDriver(settings);
  if (paymentDriver) {
    const confirmationUrl = await createPaymentForOrder(order, orderItems, settings, baseUrl || '');
    return { publicId: order.public_id, total: Number(order.total), paymentStatus: 'pending', confirmationUrl };
  }

  // Оплата не подключена — прежнее поведение (оплата при получении).
  await finalizeOrder(orderId);
  const finalized = await db('orders').where({ id: orderId }).first();
  return { publicId: finalized.public_id, total: Number(finalized.total), posStatus: finalized.pos_status, paymentStatus: 'not_required' };
}

/**
 * Заказ «в работу»: отправка в POS + уведомление персоналу в MAX.
 * Вызывается сразу (оплата при получении) или из вебхука после оплаты.
 */
export async function finalizeOrder(orderId) {
  await pushOrderToPos(orderId);
  const order = await db('orders').where({ id: orderId }).first();
  const items = await db('order_items').where({ order_id: orderId });
  // Fire-and-forget: не задерживает ответ и не может сорвать заказ.
  notifyNewOrderMax(order, items).catch(() => {});
}

/** Отправка (или переотправка) заказа в POS. */
export async function pushOrderToPos(orderId) {
  const order = await db('orders').where({ id: orderId }).first();
  if (!order) throw httpError(404, 'Заказ не найден');
  const items = await db('order_items').where({ order_id: orderId });

  try {
    const pos = await getPosDriver();
    const result = await pos.sendOrder({ ...order, items });
    await db('orders').where({ id: orderId }).update({
      pos_status: 'sent',
      pos_external_id: result.externalId,
      pos_error: null,
      updated_at: db.fn.now(),
    });
  } catch (err) {
    await db('orders').where({ id: orderId }).update({
      pos_status: 'error',
      pos_error: String(err.message || err).slice(0, 2000),
      updated_at: db.fn.now(),
    });
  }
}

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}
