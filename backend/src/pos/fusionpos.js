/**
 * Драйвер FUSIONPOS (fusionpos.ru), API v1.
 * Спецификация: https://fusionpos.ru/api/
 * (OpenAPI-схема: https://devfiles.fusionpos.ru/_swagger/api/v1.yaml —
 * но реальный ответ местами шире задокументированного, например uuid
 * у категорий там не описан, хотя реально возвращается).
 *
 * Базовый URL — домен вашего кабинета FUSIONPOS, например
 * https://my-domain.fusionpos.ru (без /api/v1 — этот путь добавляется сам).
 * Токену нужны права: «Меню» — просмотр.
 *
 * Категории и позиции отдают оба идентификатора (id и uuid) — синк хранит
 * оба, сопоставление идёт по любому из них (см. menuSync.js).
 *
 * С expand=nomenclature позиция приходит с описанием и КБЖУ из связанной
 * номенклатуры — используем их для description/compound/allergens/БЖУ.
 *
 * Пока реализована только загрузка меню (категории + позиции), как и
 * договаривались. Публичная спецификация API v1 не описывает эндпоинт
 * отправки внешних заказов — sendOrder() ниже оставлен заготовкой на
 * будущее и ожидаемо не сработает, пока FUSIONPOS не даст точный путь.
 */

const MENU_CATEGORIES_PATH = '/api/v1/menu-categories';
const MENUS_PATH = '/api/v1/menus';
const ORDERS_PATH = '/api/v1/external-orders';

// Схема MeasurementUnitId в спецификации перечисляет подписи по порядку
// (1 Milliliter … 8 Portion); точное числовое соответствие для конкретного
// кабинета можно проверить в панели FUSIONPOS. Единицу измерения позиции
// всегда можно поправить вручную в разделе «Меню» — при повторном синке
// это значение не перезатирается.
const MEASUREMENT_UNIT_LABELS = {
  1: 'мл',
  2: 'л',
  3: 'мг',
  4: 'г',
  5: 'кг',
  6: 'уп',
  7: 'шт',
  8: 'порция',
};

export class FusionPosDriver {
  constructor({ baseUrl, token }) {
    if (!baseUrl || !token) {
      throw new Error('FUSIONPOS: не заданы базовый URL и/или API-токен (настройки админки)');
    }
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.token = token;
  }

  async #request(method, path, { query, body } = {}) {
    const qs = query ? `?${new URLSearchParams(query)}` : '';
    let res;
    try {
      res = await fetch(this.baseUrl + path + qs, {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new Error(`FUSIONPOS ${method} ${path}: ${e.cause?.message || e.message}`);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`FUSIONPOS ${method} ${path}: HTTP ${res.status} ${text.slice(0, 500)}`);
    }
    return res.json();
  }

  async fetchMenu() {
    const [categoriesRes, menusRes] = await Promise.all([
      this.#request('GET', MENU_CATEGORIES_PATH, { query: { pagination: 'false', is_deleted: 'false' } }),
      this.#request('GET', MENUS_PATH, {
        query: {
          pagination: 'false',
          is_deleted: 'false',
          available_external_orders: 'true',
          expand: 'nomenclature',
        },
      }),
    ]);
    return mapMenuResponse(categoriesRes.items ?? [], menusRes.items ?? []);
  }

  async sendOrder(order) {
    const payload = buildOrderPayload(order);
    const data = await this.#request('POST', ORDERS_PATH, { body: payload });
    return { externalId: String(data.id ?? data.orderId ?? '') };
  }
}

// Поле может лежать прямо на позиции или во вложенном nomenclature
// (expand=nomenclature) — точная форма не описана в публичной спецификации,
// поэтому проверяем оба варианта.
function nomField(p, field) {
  const v = p.nomenclature?.[field] ?? p[field];
  return v === undefined ? null : v;
}

// Маппинг ответа FUSIONPOS (/menu-categories, /menus) в наш внутренний формат меню.
function mapMenuResponse(categoriesRaw, productsRaw) {
  const categories = categoriesRaw.map((c) => ({
    externalId: String(c.id),
    externalUuid: c.uuid || null,
    name: c.name,
    sortOrder: c.sort_position ?? 0,
  }));
  const products = productsRaw.map((p) => ({
    externalId: String(p.id),
    externalUuid: p.uuid || null,
    categoryExternalId: p.category_id != null ? String(p.category_id) : null,
    name: p.name,
    description: nomField(p, 'description') || '',
    compound: nomField(p, 'compound'),
    allergens: nomField(p, 'allergens'),
    protein: nomField(p, 'protein'),
    fat: nomField(p, 'fat'),
    carbohydrate: nomField(p, 'carbohydrate'),
    kilocalories: nomField(p, 'kilocalories'),
    imageUrl: p.image_url || null,
    price: Math.round(Number(p.price) || 0) / 100, // цена у FUSIONPOS — в копейках
    isAvailable: p.is_active !== false && !p.is_stopped,
    sortOrder: p.sort_position ?? 0,
    unit: p.is_bulk ? (MEASUREMENT_UNIT_LABELS[p.measurement_unit_id] || 'кг') : undefined,
    qtyStep: p.is_bulk ? (Number(p.weight_quantum) > 0 ? Number(p.weight_quantum) : 0.1) : undefined,
    isWeight: !!p.is_bulk,
  }));
  return { categories, products };
}

// Формирование тела внешнего заказа для FUSIONPOS.
// Не подтверждено реальной спецификацией — скорректировать, когда появится точный эндпоинт.
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
      quantity: Number(it.qty),
      unit: it.unit,
    })),
    deliveryFee: Number(order.delivery_fee),
    total: Number(order.total),
  };
}
