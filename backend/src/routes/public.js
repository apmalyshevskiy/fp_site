import { Router } from 'express';
import { db } from '../db.js';
import { getPublicSettings } from '../settings.js';
import { createOrder } from '../services/orders.js';
import { handleYooKassaWebhook, refreshOrderPayment } from '../services/payments.js';
import { applyOverrides, pricingOf } from '../services/overrides.js';
import { modifiersByProduct } from '../services/modifiers.js';

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
    const mods = await modifiersByProduct(products.map((p) => p.id));
    const result = categories
      .map((c) => ({
        id: c.id,
        name: c.name,
        products: products
          .filter((p) => p.category_id === c.id)
          .map((p) => {
            const pricing = pricingOf(p);
            return {
            id: p.id,
            name: p.name,
            description: p.description,
            price: pricing.final, // акционная цена, если действует скидка
            oldPrice: pricing.oldPrice, // базовая цена для перечёркивания (null без акции)
            discountPercent: pricing.discountPercent,
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
            modifierGroups: mods.get(p.id) || [],
            };
          }),
      }))
      .filter((c) => c.products.length > 0);
    res.json(result);
  } catch (e) { next(e); }
});

// Оформление заказа
publicRouter.post('/orders', async (req, res, next) => {
  try {
    // Базовый URL сайта — для return_url платежа (nginx проксирует с этими заголовками)
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = host ? `${proto}://${host}` : '';
    const result = await createOrder(req.body || {}, { baseUrl });
    res.status(201).json(result);
  } catch (e) { next(e); }
});

// Статус заказа (для страницы «Заказ принят» — дождаться подтверждения оплаты).
// Отдаём минимум: номер, статус оплаты и сумму.
publicRouter.get('/orders/:publicId/status', async (req, res, next) => {
  try {
    let order = await db('orders').where({ public_id: String(req.params.publicId) }).first();
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });
    // Ждём оплату — сверяемся с ЮKassa напрямую: вебхук мог не дойти
    // (localhost, ещё не настроенные HTTP-уведомления, задержка доставки).
    if (order.payment_status === 'pending') {
      order = await refreshOrderPayment(order);
    }
    res.json({ publicId: order.public_id, paymentStatus: order.payment_status, total: Number(order.total) });
  } catch (e) { next(e); }
});

// Вебхук ЮKassa (уведомление об оплате). Подпись не проверяем — вместо этого
// внутри перезапрашиваем платёж у ЮKassa авторитетно (см. handleYooKassaWebhook).
publicRouter.post('/payments/yookassa/webhook', async (req, res) => {
  try {
    await handleYooKassaWebhook(req.body || {});
    res.status(200).json({ ok: true });
  } catch (e) {
    // 500 → ЮKassa повторит доставку (ошибка обычно транзиентная: БД/сеть).
    console.error('YooKassa webhook:', e.message);
    res.status(500).json({ error: 'retry' });
  }
});
