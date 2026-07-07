// Статус приёма заказов на витрине — зеркало backend/src/services/workHours.js
// (сервер остаётся источником истины: createOrder проверяет то же самое).
// Время считается в таймзоне РЕСТОРАНА (work_timezone), а не посетителя.

const DEFAULT_TZ = 'Europe/Moscow';

function parseHM(str) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(str || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function minutesNowIn(timeZone, now) {
  const fmt = new Intl.DateTimeFormat('ru-RU', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false });
  const [h, m] = fmt.format(now).split(':').map(Number);
  return h * 60 + m;
}

export function getOrderingStatus(settings, now = new Date()) {
  if (settings.orders_paused === 'true') return { open: false, reason: 'paused' };
  if (settings.work_schedule_enabled !== 'true') return { open: true };

  const openMin = parseHM(settings.work_open);
  const closeMin = parseHM(settings.work_close);
  if (openMin == null || closeMin == null || openMin === closeMin) return { open: true };

  let nowMin;
  try {
    nowMin = minutesNowIn(settings.work_timezone || DEFAULT_TZ, now);
  } catch {
    nowMin = minutesNowIn(DEFAULT_TZ, now);
  }

  const open = openMin < closeMin
    ? nowMin >= openMin && nowMin < closeMin
    : nowMin >= openMin || nowMin < closeMin;

  return open
    ? { open: true }
    : { open: false, reason: 'schedule', openTime: settings.work_open, closeTime: settings.work_close };
}

export function closedMessage(status) {
  if (status.reason === 'paused') return 'Приём заказов временно приостановлен. Загляните позже.';
  return `Сейчас закрыто. Приём заказов с ${status.openTime} до ${status.closeTime}.`;
}
