import { db } from '../db.js';
import { getPosDriver } from '../pos/index.js';

// Ищем существующую запись по любому из двух идентификаторов POS —
// драйвер может отдавать id, uuid или оба сразу (см. fusionpos.js).
function findExisting(trx, table, externalId, externalUuid) {
  return trx(table)
    .where((qb) => {
      if (externalUuid) qb.orWhere({ external_uuid: externalUuid });
      if (externalId) qb.orWhere({ external_id: externalId });
    })
    .first();
}

/**
 * Синхронизация меню из POS в MariaDB.
 * Локальные оверрайды (is_visible, unit, qty_step) при повторном синке не
 * затираются. Картинка и вес порции из POS подставляются, только если своих
 * ещё нет (image_url/weight_label пусты) — если админ уже задал своё
 * значение, POS его не трогает. Позиции, исчезнувшие из POS, помечаются
 * недоступными (не удаляются, чтобы не потерять картинки и историю).
 */
export async function syncMenu() {
  const pos = await getPosDriver();
  const menu = await pos.fetchMenu();

  let stats = { categories: 0, products: 0, disabled: 0 };

  await db.transaction(async (trx) => {
    // По значению любого из двух идентификаторов категории -> её id в нашей БД
    const catIdByExternal = {};

    for (const cat of menu.categories) {
      const existing = await findExisting(trx, 'categories', cat.externalId, cat.externalUuid);
      const row = {
        name: cat.name,
        sort_order: cat.sortOrder,
        external_id: cat.externalId ?? null,
        external_uuid: cat.externalUuid ?? null,
      };
      let id;
      if (existing) {
        id = existing.id;
        await trx('categories').where({ id }).update({ ...row, updated_at: trx.fn.now() });
      } else {
        [id] = await trx('categories').insert(row);
      }
      if (cat.externalId) catIdByExternal[cat.externalId] = id;
      if (cat.externalUuid) catIdByExternal[cat.externalUuid] = id;
      stats.categories++;
    }

    const seenProductIds = [];
    for (const p of menu.products) {
      const row = {
        category_id: catIdByExternal[p.categoryExternalId] ?? null,
        name: p.name,
        description: p.description,
        price: p.price,
        is_available: p.isAvailable,
        sort_order: p.sortOrder,
        external_id: p.externalId ?? null,
        external_uuid: p.externalUuid ?? null,
        // Из номенклатуры (expand=nomenclature) — фактические данные POS,
        // как и цена/название, обновляются при каждом синке.
        compound: p.compound ?? null,
        allergens: p.allergens ?? null,
        protein: p.protein ?? null,
        fat: p.fat ?? null,
        carbohydrate: p.carbohydrate ?? null,
        kilocalories: p.kilocalories ?? null,
      };
      const existing = await findExisting(trx, 'products', p.externalId, p.externalUuid);
      let id;
      if (existing) {
        id = existing.id;
        // unit/qty_step не обновляем: это настройки позиции, управляются из админки.
        // image_url и weight_label подставляем из POS, только если своих ещё нет —
        // номенклатура (а с ней и вес порции) есть не у каждой позиции.
        if (p.imageUrl && !existing.image_url) row.image_url = p.imageUrl;
        if (p.weightLabel && !existing.weight_label) row.weight_label = p.weightLabel;
        await trx('products').where({ id }).update({ ...row, updated_at: trx.fn.now() });
      } else {
        [id] = await trx('products').insert({
          ...row,
          image_url: p.imageUrl || null,
          unit: p.unit || 'шт',
          qty_step: p.qtyStep > 0 ? p.qtyStep : 1,
          is_weight: !!p.isWeight,
          weight_label: p.weightLabel || null,
        });
      }
      seenProductIds.push(id);
      stats.products++;
    }

    // Позиции, которых больше нет в POS — в стоп
    if (seenProductIds.length) {
      stats.disabled = await trx('products')
        .whereNotIn('id', seenProductIds)
        .whereNotNull('external_id')
        .update({ is_available: false, updated_at: trx.fn.now() });
    }
  });

  return stats;
}
