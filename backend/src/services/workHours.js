/**
 * Время работы сайта (приём заказов).
 *
 * Настройки (в БД, ключи settings):
 *   orders_paused          'true' — приём заказов приостановлен вручную (перекрывает всё)
 *   work_schedule_enabled  'true' — ограничивать приём заказов по времени
 *   work_open / work_close 'HH:MM' — интервал приёма. close < open означает
 *                          работу «через полночь» (например 10:00–02:00)
 *   work_timezone          IANA-зона ресторана (по умолчанию Europe/Moscow) —
 *                          сервер и клиент могут быть в других зонах
 *
 * Ошибочная конфигурация (кривое время/зона) трактуется как «открыто» —
 * лучше принять заказ, чем молча потерять все заказы из-за опечатки.
 */

const DEFAULT_TZ = 'Europe/Moscow';

function parseHM(str) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(str || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

// Текущее время (минуты от полуночи) в заданной таймзоне
function minutesNowIn(timeZone, now) {
  const fmt = new Intl.DateTimeFormat('ru-RU', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const [h, m] = fmt.format(now).split(':').map(Number);
  return h * 60 + m;
}

/**
 * Статус приёма заказов: { open, reason?, openTime?, closeTime? }
 * reason: 'paused' — ручная пауза; 'schedule' — вне времени работы.
 * `now` инжектируется в тестах.
 */
export function getOrderingStatus(settings, now = new Date()) {
  if (settings.orders_paused === 'true') {
    return { open: false, reason: 'paused' };
  }
  if (settings.work_schedule_enabled !== 'true') {
    return { open: true };
  }

  const openMin = parseHM(settings.work_open);
  const closeMin = parseHM(settings.work_close);
  if (openMin == null || closeMin == null || openMin === closeMin) {
    // не задано/испорчено/одинаковое время — считаем круглосуточным
    return { open: true };
  }

  let nowMin;
  try {
    nowMin = minutesNowIn(settings.work_timezone || DEFAULT_TZ, now);
  } catch {
    nowMin = minutesNowIn(DEFAULT_TZ, now); // кривая зона в настройках
  }

  // Обычный интервал (10:00–22:00) или «через полночь» (10:00–02:00)
  const open = openMin < closeMin
    ? nowMin >= openMin && nowMin < closeMin
    : nowMin >= openMin || nowMin < closeMin;

  return open
    ? { open: true }
    : { open: false, reason: 'schedule', openTime: settings.work_open, closeTime: settings.work_close };
}

/** Человекочитаемое сообщение о том, почему заказ сейчас не принять. */
export function closedMessage(status) {
  if (status.reason === 'paused') {
    return 'Приём заказов временно приостановлен. Загляните позже.';
  }
  return `Сейчас закрыто. Приём заказов с ${status.openTime} до ${status.closeTime}.`;
}

// Минимальное время на приготовление заказа «ко времени», минут
const SCHEDULE_LEAD_MIN = 30;

const fmtMin = (min) => {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/**
 * Заказ «ко времени»: превращает желаемое время 'HH:MM' (в таймзоне ресторана)
 * в абсолютный момент. Правила:
 *  - время должно попадать в окно работы (если расписание включено);
 *  - минимум SCHEDULE_LEAD_MIN минут от «сейчас» — иначе ошибка с подсказкой
 *    ближайшего доступного времени (а не молчаливый перенос на завтра);
 *  - при окне «через полночь» (10:00–02:00) время после полуночи относится
 *    к текущему рабочему дню (заказ в 23:00 «к 01:30» — это сегодня).
 * Бросает Error с готовым текстом для клиента; `now` инжектируется в тестах.
 */
export function resolveScheduledAt(settings, hhmm, now = new Date()) {
  const timeMin = parseHM(hhmm);
  if (timeMin == null) throw new Error('Укажите корректное время в формате ЧЧ:ММ');

  let nowMin;
  try {
    nowMin = minutesNowIn(settings.work_timezone || DEFAULT_TZ, now);
  } catch {
    nowMin = minutesNowIn(DEFAULT_TZ, now);
  }

  const openMin = settings.work_schedule_enabled === 'true' ? parseHM(settings.work_open) : null;
  const closeMin = settings.work_schedule_enabled === 'true' ? parseHM(settings.work_close) : null;
  const hasWindow = openMin != null && closeMin != null && openMin !== closeMin;

  if (hasWindow) {
    const inWindow = openMin < closeMin
      ? timeMin >= openMin && timeMin < closeMin
      : timeMin >= openMin || timeMin < closeMin;
    if (!inWindow) {
      throw new Error(`Заказы к времени принимаем с ${settings.work_open} до ${settings.work_close}`);
    }
  }

  let deltaMin = timeMin - nowMin;
  // Окно «через полночь»: время из сегмента после полуночи — это ещё сегодняшний
  // рабочий день, а не прошедшее время.
  if (deltaMin < 0 && hasWindow && openMin > closeMin && timeMin < closeMin) {
    deltaMin += 24 * 60;
  }

  if (deltaMin < SCHEDULE_LEAD_MIN) {
    throw new Error(
      `Нам нужно минимум ${SCHEDULE_LEAD_MIN} минут на приготовление — ` +
      `ближайшее время: ${fmtMin(nowMin + SCHEDULE_LEAD_MIN)}`
    );
  }

  // Абсолютный момент: «сейчас» + разница в минутах (секунды обнуляем)
  const at = new Date(now.getTime() + deltaMin * 60000);
  at.setSeconds(0, 0);
  return at;
}
