import { db } from '../db.js';
import { getPosDriver } from '../pos/index.js';

/**
 * Синхронизация меню из POS в MariaDB.
 * Локальные оверрайды (image_url, is_visible) при повторном синке не затираются.
 * Позиции, исчезнувшие из POS, помечаются недоступными (не удаляются,
 * чтобы не потерять картинки и историю).
 */
export async function syncMenu() {
  const pos = await getPosDriver();
  const menu = await pos.fetchMenu();

  let stats = { categories: 0, products: 0, disabled: 0 };

  await db.transaction(async (trx) => {
    const catIdByExternal = {};

    for (const cat of menu.categories) {
      const existing = await trx('categories').where({ external_id: cat.externalId }).first();
      if (existing) {
        await trx('categories').where({ id: existing.id }).update({
          name: cat.name,
          sort_order: cat.sortOrder,
          updated_at: trx.fn.now(),
        });
        catIdByExternal[cat.externalId] = existing.id;
      } else {
        const [id] = await trx('categories').insert({
          external_id: cat.externalId,
          name: cat.name,
          sort_order: cat.sortOrder,
        });
        catIdByExternal[cat.externalId] = id;
      }
      stats.categories++;
    }

    const seenExternalIds = [];
    for (const p of menu.products) {
      seenExternalIds.push(p.externalId);
      const row = {
        category_id: catIdByExternal[p.categoryExternalId] ?? null,
        name: p.name,
        description: p.description,
        price: p.price,
        is_available: p.isAvailable,
        sort_order: p.sortOrder,
      };
      const existing = await trx('products').where({ external_id: p.externalId }).first();
      if (existing) {
        // unit/qty_step не обновляем: это настройки позиции, управляются из админки
        await trx('products').where({ id: existing.id }).update({ ...row, updated_at: trx.fn.now() });
      } else {
        await trx('products').insert({
          ...row,
          external_id: p.externalId,
          unit: p.unit || 'шт',
          qty_step: p.qtyStep > 0 ? p.qtyStep : 1,
        });
      }
      stats.products++;
    }

    // Позиции, которых больше нет в POS — в стоп
    if (seenExternalIds.length) {
      stats.disabled = await trx('products')
        .whereNotIn('external_id', seenExternalIds)
        .whereNotNull('external_id')
        .update({ is_available: false, updated_at: trx.fn.now() });
    }
  });

  return stats;
}
