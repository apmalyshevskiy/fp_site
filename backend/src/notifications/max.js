/**
 * Уведомления в мессенджер MAX (max.ru) через его Bot API.
 * Официальная документация: https://dev.max.ru/docs-api
 *
 * База — platform-api2.max.ru (миграция со старого platform-api.max.ru
 * обязательна до 19.07.2026, поэтому сразу используем новый хост).
 * Авторизация — заголовок `Authorization: <токен>` (передача токена через
 * query-параметры больше не поддерживается; токен идёт «как есть», без Bearer).
 * Отправка в чат — POST /messages?chat_id=<id> с телом { text }.
 *
 * Пока реализованы только исходящие уведомления персоналу о новом заказе
 * и вспомогательные методы для их настройки из админки (определить чат,
 * тест-сообщение). Бот не слушает входящие сообщения — приём заказов из
 * MAX не в этой версии.
 */

const MAX_API_BASE = 'https://platform-api2.max.ru';

async function maxRequest(token, method, path, { query, body } = {}) {
  const qs = query ? `?${new URLSearchParams(query)}` : '';
  let res;
  try {
    res = await fetch(MAX_API_BASE + path + qs, {
      method,
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error(`MAX ${method} ${path}: ${e.cause?.message || e.message}`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`MAX ${method} ${path}: HTTP ${res.status} ${text.slice(0, 300)}`);
  }
  return res.json().catch(() => ({}));
}

/** Отправка текстового сообщения в чат MAX. */
export async function sendMaxMessage(token, chatId, text) {
  return maxRequest(token, 'POST', '/messages', {
    query: { chat_id: String(chatId) },
    body: { text },
  });
}

/**
 * Список чатов, где бот «засветился» (его добавили или ему написали) —
 * из GET /updates. Нужен, чтобы админ выбрал чат для уведомлений, не зная
 * chat_id вручную (MAX не показывает его в интерфейсе). Долгого поллинга не
 * держим — короткий таймаут разово при настройке.
 */
export async function fetchMaxChats(token) {
  const data = await maxRequest(token, 'GET', '/updates', { query: { timeout: '2', limit: '100' } });
  const updates = data.updates ?? [];
  const seen = new Map();
  for (const u of updates) {
    // chat_id встречается по-разному в зависимости от типа апдейта
    // (bot_added → на самом апдейте; message_created → в recipient сообщения).
    const chatId = u.chat_id ?? u.message?.recipient?.chat_id;
    if (chatId == null) continue;
    if (!seen.has(chatId)) {
      seen.set(chatId, {
        chatId,
        title: u.chat_title ?? u.message?.recipient?.chat_title ?? null,
      });
    }
  }
  return [...seen.values()];
}

/** Текст уведомления о новом заказе для чата персонала. */
export function formatOrderMessage(order, items, { timeZone = 'Europe/Moscow' } = {}) {
  const money = (n) => `${Number(n)} ₽`;
  const lines = [];
  lines.push(`🔔 Новый заказ №${order.public_id}`);
  lines.push(order.type === 'delivery' ? '🚗 Доставка' : '🥡 Самовывоз');
  if (order.scheduled_at) {
    // Время — в таймзоне ресторана; дата в скобках на случай «через полночь»
    const fmt = new Intl.DateTimeFormat('ru-RU', {
      timeZone, hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit',
    }).formatToParts(new Date(order.scheduled_at));
    const get = (t) => fmt.find((p) => p.type === t)?.value;
    lines.push(`⏰ Ко времени: ${get('hour')}:${get('minute')} (${get('day')}.${get('month')})`);
  }
  lines.push('');
  lines.push(`${order.customer_name}, ${order.customer_phone}`);
  if (order.type === 'delivery' && order.address) lines.push(`Адрес: ${order.address}`);
  if (order.comment) lines.push(`Комментарий: ${order.comment}`);
  lines.push('');
  for (const it of items) {
    const sum = Math.round(Number(it.price) * Number(it.qty) * 100) / 100;
    const unit = it.unit && it.unit !== 'шт' ? ` ${it.unit}` : '';
    lines.push(`• ${it.name} × ${it.qty}${unit} — ${money(sum)}`);
    // Модификаторы позиции (добавки/замены/объём/исключения) — подстрокой,
    // чтобы кухня видела, что именно менять в блюде
    const mods = typeof it.modifiers === 'string' ? JSON.parse(it.modifiers) : (it.modifiers || []);
    if (mods.length) {
      lines.push(`   ◦ ${mods.map((m) => (m.price > 0 ? `${m.name} (+${money(m.price)})` : m.name)).join(' · ')}`);
    }
  }
  lines.push('');
  if (Number(order.delivery_fee) > 0) lines.push(`Доставка: ${money(order.delivery_fee)}`);
  lines.push(`Итого: ${money(order.total)}`);
  return lines.join('\n');
}

/**
 * Отправить уведомление о новом заказе в MAX. Best-effort: любые ошибки
 * логируются, но не влияют на оформление заказа. Ничего не делает, если
 * уведомления выключены или не настроены токен/чат.
 */
export async function notifyNewOrderMax(order, items) {
  // Ленивый импорт настроек (тянет за собой БД): чистые отправка/форматирование
  // выше остаются импортируемыми без слоя БД — это и упрощает их тестирование.
  const { getAllSettings } = await import('../settings.js');
  const s = await getAllSettings();
  if (s.max_enabled !== 'true') return;
  if (!s.max_bot_token || !s.max_chat_id) return;
  try {
    const text = formatOrderMessage(order, items, { timeZone: s.work_timezone || 'Europe/Moscow' });
    await sendMaxMessage(s.max_bot_token, s.max_chat_id, text);
  } catch (e) {
    console.error('MAX notify failed:', e.message);
  }
}
