import { Router } from 'express';
import { db } from '../db.js';
import { getPublicSettings } from '../settings.js';
import { createOrder } from '../services/orders.js';
import { applyOverrides } from '../services/overrides.js';

export const publicRouter = Router();

// Настройки сайта (шапка, контакты, доставка) для фронта
publicRouter.get('/settings', async (_req, res, next) => {
  try {
    res.json(await getPublicSettings());
  } catch (e) { next(e); }
});

// Меню: видимые категории с видимыми и доступными позициями
publicRouter.get('/menu', async (_req, res, next) => {
  try {
    // sort_order может быть переопределён вручную — сортируем уже после
    // applyOverrides, а не в SQL (иначе учтётся сырое значение из POS).
    const categories = (await db('categories').where({ is_visible: true }))
      .map(applyOverrides)
      .sort((a, b) => a.sort_order - b.sort_order);
    const products = (await db('products').where({ is_visible: true, is_available: true }))
      .map(applyOverrides)
      .sort((a, b) => a.sort_order - b.sort_order);
    const result = categories
      .map((c) => ({
        id: c.id,
        name: c.name,
        products: products
          .filter((p) => p.category_id === c.id)
          .map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: Number(p.price),
            imageUrl: p.image_url,
            unit: p.unit || 'шт',
            qtyStep: Number(p.qty_step) || 1,
            isWeight: !!p.is_weight,
            weightLabel: p.weight_label || null,
            compound: p.compound || null,
            allergens: p.allergens || null,
            protein: p.protein != null ? Number(p.protein) : null,
            fat: p.fat != null ? Number(p.fat) : null,
            carbohydrate: p.carbohydrate != null ? Number(p.carbohydrate) : null,
            kilocalories: p.kilocalories != null ? Number(p.kilocalories) : null,
          })),
      }))
      .filter((c) => c.products.length > 0);
    res.json(result);
  } catch (e) { next(e); }
});

// Оформление заказа
publicRouter.post('/orders', async (req, res, next) => {
  try {
    const result = await createOrder(req.body || {});
    res.status(201).json(result);
  } catch (e) { next(e); }
});
