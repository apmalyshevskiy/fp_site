// Модификаторы позиций: добавки, замены, объёмы, исключения.
// Чистая логика (resolveItemModifiers) отделена от БД — импорт db ленивый,
// чтобы модуль тестировался изолированно без node_modules бэкенда.

/**
 * Группы модификаторов для набора товаров.
 * Возвращает Map: productId -> [{ id, name, type, options: [{ id, name,
 * priceDelta, isDefault }] }] (обе коллекции в порядке sort_order).
 */
export async function modifiersByProduct(productIds) {
  const map = new Map();
  if (!productIds.length) return map;
  const { db } = await import('../db.js');
  const groups = await db('modifier_groups').whereIn('product_id', productIds).orderBy('sort_order');
  if (!groups.length) return map;
  const options = await db('modifier_options')
    .whereIn('group_id', groups.map((g) => g.id))
    .orderBy('sort_order');
  for (const g of groups) {
    const shaped = {
      id: g.id,
      name: g.name,
      type: g.type,
      options: options
        .filter((o) => o.group_id === g.id)
        .map((o) => ({
          id: o.id,
          name: o.name,
          priceDelta: Number(o.price_delta),
          isDefault: !!o.is_default,
        })),
    };
    if (!map.has(g.product_id)) map.set(g.product_id, []);
    map.get(g.product_id).push(shaped);
  }
  return map;
}

/**
 * Проверка выбора модификаторов и расчёт доплаты. Чистая функция.
 *  - single-группа: не больше одного варианта; если не выбран — берётся
 *    вариант по умолчанию (если он задан);
 *  - multi-группа: любой набор;
 *  - незнакомые id (конфиг переиздан) — ошибка «обновите страницу».
 * Возвращает { delta, snapshot: [{ group, name, price }] }.
 */
export function resolveItemModifiers(groups, chosenIds) {
  const chosen = new Set((chosenIds || []).map(Number));
  const known = new Set();
  const snapshot = [];
  let delta = 0;

  for (const g of groups) {
    for (const o of g.options) known.add(o.id);
    const selected = g.options.filter((o) => chosen.has(o.id));
    if (g.type === 'single') {
      if (selected.length > 1) throw new Error(`«${g.name}»: можно выбрать только один вариант`);
      const pick = selected[0] || g.options.find((o) => o.isDefault) || null;
      if (pick) {
        delta += pick.priceDelta;
        snapshot.push({ group: g.name, name: pick.name, price: pick.priceDelta });
      }
    } else {
      for (const o of selected) {
        delta += o.priceDelta;
        snapshot.push({ group: g.name, name: o.name, price: o.priceDelta });
      }
    }
  }

  for (const id of chosen) {
    if (!known.has(id)) throw new Error('состав модификаторов изменился, обновите страницу');
  }

  return { delta: Math.round(delta * 100) / 100, snapshot };
}

/** Короткая строка для чека/сообщений: "0.4 л · кокосовое молоко (+50 ₽)". */
export function modifiersLine(snapshot) {
  return (snapshot || [])
    .map((m) => (m.price > 0 ? `${m.name} (+${m.price} ₽)` : m.name))
    .join(' · ');
}
