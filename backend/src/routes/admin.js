import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { login, requireAuth } from '../auth.js';
import { getAllSettings, setSettings } from '../settings.js';
import { syncMenu } from '../services/menuSync.js';
import { pushOrderToPos } from '../services/orders.js';

export const adminRouter = Router();

const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || './uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${nanoid(12)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(
      path.extname(file.originalname).toLowerCase()
    );
    cb(ok ? null : new Error('Допустимы только изображения (jpg, png, webp, gif)'), ok);
  },
});

adminRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const token = await login(email, password);
    if (!token) return res.status(401).json({ error: 'Неверный email или пароль' });
    res.json({ token });
  } catch (e) { next(e); }
});

adminRouter.use(requireAuth);

// --- Настройки ---
adminRouter.get('/settings', async (_req, res, next) => {
  try { res.json(await getAllSettings()); } catch (e) { next(e); }
});

adminRouter.put('/settings', async (req, res, next) => {
  try {
    await setSettings(req.body || {});
    res.json(await getAllSettings());
  } catch (e) { next(e); }
});

// --- Загрузка изображений (логотип, шапка, блюда) ---
adminRouter.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Файл не получен' });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

// --- Меню ---
adminRouter.post('/menu/sync', async (_req, res, next) => {
  try {
    const stats = await syncMenu();
    res.json({ ok: true, ...stats });
  } catch (e) { next(e); }
});

adminRouter.get('/menu', async (_req, res, next) => {
  try {
    const categories = await db('categories').orderBy('sort_order');
    const products = await db('products').orderBy('sort_order');
    res.json({ categories, products });
  } catch (e) { next(e); }
});

// Локальные оверрайды позиции: картинка, видимость, сортировка
adminRouter.patch('/products/:id', async (req, res, next) => {
  try {
    const patch = {};
    if ('imageUrl' in req.body) patch.image_url = req.body.imageUrl || null;
    if ('isVisible' in req.body) patch.is_visible = !!req.body.isVisible;
    if ('sortOrder' in req.body) patch.sort_order = Number(req.body.sortOrder) || 0;
    if (!Object.keys(patch).length) return res.status(400).json({ error: 'Нет изменений' });
    await db('products').where({ id: req.params.id }).update({ ...patch, updated_at: db.fn.now() });
    res.json(await db('products').where({ id: req.params.id }).first());
  } catch (e) { next(e); }
});

adminRouter.patch('/categories/:id', async (req, res, next) => {
  try {
    const patch = {};
    if ('isVisible' in req.body) patch.is_visible = !!req.body.isVisible;
    if ('sortOrder' in req.body) patch.sort_order = Number(req.body.sortOrder) || 0;
    if (!Object.keys(patch).length) return res.status(400).json({ error: 'Нет изменений' });
    await db('categories').where({ id: req.params.id }).update({ ...patch, updated_at: db.fn.now() });
    res.json(await db('categories').where({ id: req.params.id }).first());
  } catch (e) { next(e); }
});

// --- Заказы ---
adminRouter.get('/orders', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const orders = await db('orders').orderBy('id', 'desc').limit(limit);
    const ids = orders.map((o) => o.id);
    const items = ids.length ? await db('order_items').whereIn('order_id', ids) : [];
    res.json(orders.map((o) => ({
      ...o,
      items: items.filter((it) => it.order_id === o.id),
    })));
  } catch (e) { next(e); }
});

adminRouter.patch('/orders/:id', async (req, res, next) => {
  try {
    const status = req.body?.status;
    if (!['new', 'accepted', 'done', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Неверный статус' });
    }
    await db('orders').where({ id: req.params.id }).update({ status, updated_at: db.fn.now() });
    res.json(await db('orders').where({ id: req.params.id }).first());
  } catch (e) { next(e); }
});

// Переотправка заказа в POS (если была ошибка)
adminRouter.post('/orders/:id/resend', async (req, res, next) => {
  try {
    await pushOrderToPos(Number(req.params.id));
    res.json(await db('orders').where({ id: req.params.id }).first());
  } catch (e) { next(e); }
});
