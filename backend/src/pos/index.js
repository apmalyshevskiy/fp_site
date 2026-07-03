import { MockPosDriver } from './mock.js';
import { FusionPosDriver } from './fusionpos.js';
import { getAllSettings } from '../settings.js';

/**
 * Единый интерфейс драйвера POS:
 *   fetchMenu(): Promise<{ categories: [{externalId, name, sortOrder}],
 *                          products: [{externalId, categoryExternalId, name, description,
 *                                      price, isAvailable, sortOrder}] }>
 *   sendOrder(order): Promise<{ externalId: string }>
 *
 * Драйвер выбирается настройкой pos_driver (в БД) или переменной POS_DRIVER.
 */
export async function getPosDriver() {
  const settings = await getAllSettings();
  const driver = settings.pos_driver || process.env.POS_DRIVER || 'mock';
  if (driver === 'fusionpos') {
    return new FusionPosDriver({
      baseUrl: settings.fusionpos_base_url || process.env.FUSIONPOS_BASE_URL,
      token: settings.fusionpos_token || process.env.FUSIONPOS_TOKEN,
    });
  }
  return new MockPosDriver();
}
