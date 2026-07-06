# Деплой на продакшн (Selectel, Docker + системный nginx)

Есть два варианта развёртывания — выберите один:

- **Вариант А (по умолчанию, ниже):** весь стек в Docker — `app` + `db` (MariaDB
  в контейнере). Файл `docker-compose.prod.yml`. Контейнерная БД **не связана**
  с вашей хостовой MariaDB и не публикует 3306 — конфликта портов нет, хостовая
  БД остаётся нетронутой.
- **Вариант Б (см. раздел в конце):** приложение в Docker, а БД — ваша
  **существующая MariaDB на хосте** (без второго контейнера с СУБД). Файл
  `docker-compose.host-db.yml`. Экономит ресурсы, но требует небольшой
  настройки MariaDB на хосте.

Публичный доступ и TLS в обоих вариантах обеспечивает системный nginx.

## 0. Что нужно на сервере
- Ubuntu/Debian, домен, A-запись домена → IP сервера.
- Установленный nginx.
- Docker + плагин compose:
  ```bash
  curl -fsSL https://get.docker.com | sudo sh
  docker compose version   # проверка
  ```

## 1. Код на сервер
```bash
cd /opt
sudo git clone <адрес-репозитория> fp_site   # или scp/rsync каталог проекта
cd fp_site
```

## 2. Настройки окружения
```bash
cp .env.production.example .env
nano .env
```
Обязательно задайте свои значения (сгенерировать секреты):
```bash
openssl rand -hex 32    # для JWT_SECRET
openssl rand -hex 24    # для DB_PASSWORD / DB_ROOT_PASSWORD
```
`ADMIN_EMAIL` / `ADMIN_PASSWORD` — учётка для входа в админку (создаётся при
первом старте). `POS_DRIVER` можно оставить `mock` и переключить позже в админке.

## 3. Сборка и запуск
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
При старте автоматически применяются миграции и идемпотентные сиды
(существующие настройки/админ не перезаписываются). Проверить:
```bash
docker compose -f docker-compose.prod.yml logs -f app
# ждём строку: Backend listening on :3000
curl -I http://127.0.0.1:8080/     # ожидаем 200 OK
```

## 4. nginx + TLS
```bash
sudo cp deploy/nginx/fp_site.conf /etc/nginx/sites-available/fp_site.conf
sudo nano /etc/nginx/sites-available/fp_site.conf   # заменить ваш-домен.ru
sudo ln -s /etc/nginx/sites-available/fp_site.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# TLS (certbot сам допишет 443-блок и авто-продление):
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ваш-домен.ru
```

## 5. Первичная настройка в админке
Откройте `https://ваш-домен.ru/admin/login`, войдите под `ADMIN_EMAIL`/`ADMIN_PASSWORD`,
затем в **Настройки**:
- витрина (название, контакты, доставка, логотип/баннер);
- **POS**: драйвер FUSIONPOS + базовый URL и токен → на странице **Меню** нажать «Синхронизировать»;
- **Уведомления в MAX**: вставить токен бота → «Определить чат» → выбрать чат → «Отправить тест».

## 6. Обновление версии
```bash
cd /opt/fp_site
git pull
docker compose -f docker-compose.prod.yml up -d --build
```
Данные (БД, загрузки) сохраняются: БД — в volume `db_data`, картинки — в `./uploads`.

## 7. Бэкапы
```bash
# База (дамп)
docker compose -f docker-compose.prod.yml exec db \
  sh -c 'exec mariadb-dump -ufp -p"$MARIADB_PASSWORD" "$MARIADB_DATABASE"' \
  > backup-$(date +%F).sql

# Загруженные картинки — просто каталог на хосте
tar czf uploads-$(date +%F).tgz -C /opt/fp_site uploads
```

## 8. Файрвол
Публично открыть только 80 и 443. Порт приложения (8080) слушается на 127.0.0.1,
порт контейнерной БД наружу не публикуется — дополнительных правил не нужно.
```bash
sudo ufw allow 80,443/tcp
sudo ufw enable
```

## Примечания
- Сертификат MAX (Russian Trusted Root CA, Минцифры) уже вшит в образ и
  подключается через `NODE_EXTRA_CA_CERTS` — на проде ничего дополнительно
  настраивать не нужно.
- Приложение отдаёт и API, и фронтенд на одном порту, поэтому nginx просто
  проксирует всё на `127.0.0.1:8080`.

---

# Вариант Б: БД на хосте (существующая MariaDB)

Приложение в Docker, но подключается к вашей MariaDB на хосте — контейнер с БД
не поднимается. Шаги 4–8 (nginx, TLS, файрвол, бэкап загрузок, обновление)
такие же, отличается только БД и файл compose.

### Б.1. Подготовка MariaDB на хосте
Создайте базу и пользователя (миграции создадут таблицы сами при первом старте):
```sql
CREATE DATABASE fp_site CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Контейнер подключается из подсети Docker (обычно 172.x), поэтому доступ с '172.%'
CREATE USER 'fp'@'172.%' IDENTIFIED BY 'ваш_пароль_БД';
GRANT ALL PRIVILEGES ON fp_site.* TO 'fp'@'172.%';
FLUSH PRIVILEGES;
```
Разрешите MariaDB принимать подключения со шлюза Docker. В `my.cnf`
(обычно `/etc/mysql/mariadb.conf.d/50-server.cnf`):
```ini
# Слушать в т.ч. интерфейс docker-моста. 0.0.0.0 — проще всего, но тогда
# ОБЯЗАТЕЛЬНО закройте 3306 файрволом от интернета (см. ниже).
bind-address = 0.0.0.0
```
```bash
sudo systemctl restart mariadb
```
Файрвол: 3306 не должен быть доступен снаружи — откройте его только для
docker-моста:
```bash
sudo ufw allow in on docker0 to any port 3306 proto tcp
sudo ufw deny 3306/tcp
```

### Б.2. Запуск приложения
```bash
cp .env.host-db.example .env
nano .env      # задать DB_PASSWORD (как в GRANT выше), JWT_SECRET, ADMIN_*
docker compose -f docker-compose.host-db.yml up -d --build
docker compose -f docker-compose.host-db.yml logs -f app
# ждём: Backend listening on :3000
curl -fsS http://127.0.0.1:8080/api/health    # ожидаем {"ok":true}
```
Если в логах `ECONNREFUSED`/`Access denied` — проверьте `bind-address`, что
MariaDB перезапущена, и что грант выдан на `'fp'@'172.%'` (или на конкретный
адрес контейнера из `docker inspect`).

### Б.3. Дальше — как в основном сценарии
nginx и TLS (шаг 4), настройка в админке (шаг 5), обновление (шаг 6),
бэкап загрузок (шаг 7, каталог `./uploads`). Дамп БД делается на хосте
обычным `mariadb-dump -ufp -p fp_site` — БД ведь локальная.

### Альтернатива без правки MariaDB
Если не хотите менять `bind-address`/гранты, можно запустить контейнер в сети
хоста: добавить приложению `network_mode: host` и `DB_HOST=127.0.0.1` —
тогда оно ходит в MariaDB как локальный процесс (грант `'fp'@'localhost'`).
Минус: при `network_mode: host` маппинг портов игнорируется, приложение
слушает `0.0.0.0:3000` напрямую на хосте, поэтому полагайтесь на файрвол
(наружу только 80/443). Для большинства случаев вариант Б.1 чище.
