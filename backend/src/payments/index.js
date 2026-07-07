import { YooKassaDriver } from './yookassa.js';
import { getAllSettings } from '../settings.js';

/**
 * Драйвер онлайн-оплаты выбирается настройками админки. Пока поддержан один
 * провайдер — ЮKassa. Если оплата не включена или не заданы ключи, возвращаем
 * null: тогда заказ оформляется без предоплаты (оплата при получении).
 */
export async function getPaymentDriver(settings) {
  const s = settings || (await getAllSettings());
  if (s.yookassa_enabled !== 'true') return null;
  if (!s.yookassa_shop_id || !s.yookassa_secret_key) return null;
  return new YooKassaDriver({
    shopId: s.yookassa_shop_id,
    secretKey: s.yookassa_secret_key,
    vatCode: s.yookassa_vat_code,
  });
}
