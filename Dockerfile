# Один образ: собранный фронт раздаётся бэкендом
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist /app/frontend-dist

ENV NODE_ENV=production \
    FRONTEND_DIST=/app/frontend-dist \
    UPLOADS_DIR=/data/uploads

VOLUME ["/data/uploads"]
EXPOSE 3000

# Миграции и сиды при старте, затем сервер
CMD ["sh", "-c", "npx knex migrate:latest && npx knex seed:run && node src/index.js"]
