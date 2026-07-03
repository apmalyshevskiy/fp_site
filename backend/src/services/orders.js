import { db } from '../db.js';
import { getAllSettings } from '../settings.js';
import { getPosDriver } from '../pos/index.js';

/**
 * Создание заказа: валидация → пересчёт сумм по ценам из БД (не доверяем
 * ценам с фронта) → сохранение → попытка отправки в POS.
 * Если POS недоступен, заказ сохраняется со статусом pos_status=error,
 * его можно переотправить из админки.
 */
export async function createOrder(input) {
  const settings = await getAllSettings();

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
    const qty = Math.floor(Number(item.qty));
    if (!product) throw httpError(400, 'Некоторые позиции больше недоступны, обновите страницу');
    if (!product.is_visible || !product.is_available) {
      throw httpError(400, `Позиция «${product.name}» сейчас недоступна`);
    }
    if (!(qty >= 1 && qty <= 99)) throw httpError(400, 'Неверное количество');
    itemsTotal += Number(product.price) * qty;
    orderItems.push({
      product_id: product.id,
      external_id: product.external_id,
      name: product.name,
      price: product.price,
      qty,
    });
  }

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

  await pushOrderToPos(orderId);

  const order = await db('orders').where({ id: orderId }).first();
  return { publicId: order.public_id, total: Number(order.total), posStatus: order.pos_status };
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
