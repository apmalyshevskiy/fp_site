/**
 * Драйвер FUSIONPOS V4 (fusionpos.ru).
 *
 * Интеграция строится на API-токене из Панели управления
 * (Настройки → API Токены), которому нужны права:
 *   - «Меню» — Просмотр (для загрузки меню)
 *   - «Внешние заказы» — Изменение (для передачи заказов с сайта)
 *
 * ВАЖНО: точная спецификация эндпоинтов выдаётся FUSIONPOS при подключении
 * опции «API (1С, сайты, боты)». Пути ниже (MENU_PATH / ORDERS_PATH) вынесены
 * в константы и легко корректируются под реальную документацию, как и
 * функции маппинга ответа (mapMenuResponse / buildOrderPayload).
 */

const MENU_PATH = '/api/v4/menu';
const ORDERS_PATH = '/api/v4/external-orders';

export class FusionPosDriver {
  constructor({ baseUrl, token }) {
    if (!baseUrl || !token) {
      throw new Error('FUSIONPOS: не заданы базовый URL и/или API-токен (настройки админки)');
    }
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.token = token;
  }

  async #request(method, path, body) {
    const res = await fetch(this.baseUrl + path, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`FUSIONPOS ${method} ${path}: HTTP ${res.status} ${text.slice(0, 500)}`);
    }
    return res.json();
  }

  async fetchMenu() {
    const data = await this.#request('GET', MENU_PATH);
    return mapMenuResponse(data);
  }

  async sendOrder(order) {
    const payload = buildOrderPayload(order);
    const data = await this.#request('POST', ORDERS_PATH, payload);
    return { externalId: String(data.id ?? data.orderId ?? '') };
  }
}

// Маппинг ответа FUSIONPOS в наш внутренний формат меню.
// Скорректировать поля по реальной спецификации API.
function mapMenuResponse(data) {
  const categories = (data.categories ?? []).map((c, i) => ({
    externalId: String(c.id),
    name: c.name,
    sortOrder: c.sortOrder ?? i,
  }));
  const products = (data.items ?? data.products ?? []).map((p, i) => ({
    externalId: String(p.id),
    categoryExternalId: p.categoryId != null ? String(p.categoryId) : null,
    name: p.name,
    description: p.description ?? '',
    price: Number(p.price ?? 0),
    isAvailable: p.inStopList != null ? !p.inStopList : (p.isAvailable ?? true),
    sortOrder: p.sortOrder ?? i,
  }));
  return { categories, products };
}

// Формирование тела внешнего заказа для FUSIONPOS.
// Скорректировать поля по реальной спецификации API.
function buildOrderPayload(order) {
  return {
    externalNumber: order.public_id,
    type: order.type, // pickup | delivery
    customer: {
      name: order.customer_name,
      phone: order.customer_phone,
    },
    deliveryAddress: order.type === 'delivery' ? order.address : undefined,
    comment: order.comment || undefined,
    items: order.items.map((it) => ({
      id: it.external_id,
      name: it.name,
      price: Number(it.price),
      quantity: it.qty,
    })),
    deliveryFee: Number(order.delivery_fee),
    total: Number(order.total),
  };
}
