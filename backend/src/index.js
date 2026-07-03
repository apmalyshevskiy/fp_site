import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { publicRouter } from './routes/public.js';
import { adminRouter } from './routes/admin.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/uploads', express.static(path.resolve(process.env.UPLOADS_DIR || './uploads')));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', publicRouter);
app.use('/api/admin', adminRouter);

// Раздача собранного фронта (для продакшена в одном контейнере)
const FRONTEND_DIST = process.env.FRONTEND_DIST;
if (FRONTEND_DIST) {
  app.use(express.static(FRONTEND_DIST));
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) =>
    res.sendFile(path.join(path.resolve(FRONTEND_DIST), 'index.html'))
  );
}

// Единый обработчик ошибок
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Внутренняя ошибка сервера' : err.message });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Backend listening on :${port}`));
