// Ручные переопределения полей поверх данных из POS.
// field_overrides хранит только реально переопределённые ключи —
// отсутствие ключа означает «поле как прислал POS».

export const PRODUCT_OVERRIDABLE_FIELDS = [
  'name', 'description', 'price', 'compound', 'allergens',
  'protein', 'fat', 'carbohydrate', 'kilocalories', 'sort_order',
];

export const CATEGORY_OVERRIDABLE_FIELDS = ['name', 'sort_order'];

const NUMERIC_FIELDS = new Set(['price', 'protein', 'fat', 'carbohydrate', 'kilocalories', 'sort_order']);

// MariaDB хранит JSON как LONGTEXT (+ CHECK), mysql2 её не парсит
// автоматически (в отличие от настоящего JSON-типа MySQL) — колонка может
// прийти и строкой, и уже разобранным объектом.
function parseOverrides(value) {
  if (!value) return {};
  return typeof value === 'string' ? JSON.parse(value) : value;
}

function coerce(field, value) {
  if (value === null || value === undefined) return null;
  return NUMERIC_FIELDS.has(field) ? Number(value) : String(value);
}

// Сливает текущий field_overrides с новыми set/revert-операциями.
// set и revert разделены намеренно: переопределить поле в null (например,
// вручную обнулить аллергены) — не то же самое, что снять переопределение
// и вернуться к значению POS.
export function mergeOverrides(existing, { set, revert } = {}, allowedFields) {
  const next = { ...parseOverrides(existing) };
  if (set) {
    for (const [field, value] of Object.entries(set)) {
      if (!allowedFields.includes(field)) continue;
      next[field] = coerce(field, value);
    }
  }
  if (revert) {
    for (const field of revert) delete next[field];
  }
  return next;
}

// Подставляет переопределённые поля вместо сырых значений POS — используется
// там, где строка уходит наружу как окончательная (публичное меню). Сырые
// колонки при этом не меняются, синк продолжает писать в них как раньше.
export function applyOverrides(row) {
  const overrides = parseOverrides(row.field_overrides);
  return Object.keys(overrides).length ? { ...row, ...overrides } : row;
}

// Единый расчёт цены позиции: база (цена POS с учётом ручного переопределения)
// → акционная цена (promo_price), если она задана и МЕНЬШЕ базы.
// Используется и в публичном меню, и при пересчёте заказа на сервере —
// клиент платит ровно ту цену, что видит на витрине.
export function pricingOf(row) {
  const base = Number(applyOverrides(row).price);
  const promo = row.promo_price != null ? Number(row.promo_price) : null;
  if (promo != null && promo > 0 && promo < base) {
    return {
      final: promo,
      oldPrice: base,
      discountPercent: Math.round((1 - promo / base) * 100),
    };
  }
  return { final: base, oldPrice: null, discountPercent: null };
}
