import { randomUUID } from 'node:crypto';

/**
 * Драйвер ЮKassa (yookassa.ru), API v3.
 * Документация: https://yookassa.ru/developers/api
 *
 * База — https://api.yookassa.ru/v3. Авторизация — HTTP Basic (shopId:secretKey).
 * Каждый POST требует заголовок Idempotence-Key (защита от двойного платежа).
 *
 * Поток: создаём платёж (confirmation=redirect) → отдаём confirmation_url,
 * клиент платит на странице ЮKassa (там доступны СБП и карты) → ЮKassa шлёт
 * вебхук → мы перезапрашиваем платёж по id (авторитетно) и финализируем заказ.
 *
 * Чек 54-ФЗ: у ИП без собственной кассы чек пробивает ЮKassa — для этого
 * в платёж передаётся receipt (нужно включить чеки в личном кабинете ЮKassa).
 */

const API_BASE = 'https://api.yookassa.ru/v3';

export class YooKassaDriver {
  constructor({ shopId, secretKey, vatCode }) {
    if (!shopId || !secretKey) {
      throw new Error('ЮKassa: не заданы shopId и/или секретный ключ (Настройки админки)');
    }
    this.shopId = shopId;
    this.secretKey = secretKey;
    // Ставка НДС в чеке: 1 = Без НДС (по умолчанию для ИП на УСН).
    this.vatCode = Number(vatCode) || 1;
  }

  #authHeader() {
    return 'Basic ' + Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64');
  }

  async #request(method, path, { body, idempotenceKey } = {}) {
    const headers = { Authorization: this.#authHeader(), 'Content-Type': 'application/json' };
    if (idempotenceKey) headers['Idempotence-Key'] = idempotenceKey;
    let res;
    try {
      res = await fetch(API_BASE + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new Error(`ЮKassa ${method} ${path}: ${e.cause?.message || e.message}`);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`ЮKassa ${method} ${path}: HTTP ${res.status} ${data.description || JSON.stringify(data).slice(0, 300)}`);
    }
    return data;
  }

  async createPayment({ orderId, amount, description, returnUrl, receipt }) {
    const body = {
      amount: { value: Number(amount).toFixed(2), currency: 'RUB' },
      capture: true, // одностадийный платёж — списываем сразу
      confirmation: { type: 'redirect', return_url: returnUrl },
      description,
      metadata: { order_id: String(orderId) },
    };
    if (receipt) body.receipt = receipt;
    const data = await this.#request('POST', '/payments', { body, idempotenceKey: randomUUID() });
    return {
      id: data.id,
      status: data.status,
      confirmationUrl: data.confirmation?.confirmation_url || null,
    };
  }

  async getPayment(id) {
    const data = await this.#request('GET', `/payments/${encodeURIComponent(id)}`);
    return {
      id: data.id,
      status: data.status, // pending | waiting_for_capture | succeeded | canceled
      paid: !!data.paid,
      method: data.payment_method?.type || null,
      metadata: data.metadata || {},
    };
  }
}

/**
 * Чек для 54-ФЗ: позиции заказа + доставка (если есть). amount.value — цена
 * за единицу, quantity — количество; сумма строк должна совпадать с суммой
 * платежа (каждая строка округляется до копеек так же, как order.total).
 */
export function buildReceipt({ items, deliveryFee, phone, email }, vatCode) {
  const vat = Number(vatCode) || 1;
  const receiptItems = items.map((it) => {
    // Модификаторы в названии позиции чека — цена за единицу их уже включает
    const mods = typeof it.modifiers === 'string' ? JSON.parse(it.modifiers) : (it.modifiers || []);
    const name = mods.length ? `${it.name} (${mods.map((m) => m.name).join(', ')})` : it.name;
    return {
      description: String(name).slice(0, 128),
      quantity: String(Number(it.qty)),
      amount: { value: Number(it.price).toFixed(2), currency: 'RUB' },
      vat_code: vat,
      payment_mode: 'full_prepayment',
      payment_subject: 'commodity',
    };
  });
  if (Number(deliveryFee) > 0) {
    receiptItems.push({
      description: 'Доставка',
      quantity: '1',
      amount: { value: Number(deliveryFee).toFixed(2), currency: 'RUB' },
      vat_code: vat,
      payment_mode: 'full_prepayment',
      payment_subject: 'service',
    });
  }
  const customer = {};
  if (email) customer.email = String(email);
  if (phone) customer.phone = String(phone);
  return { customer, items: receiptItems };
}
