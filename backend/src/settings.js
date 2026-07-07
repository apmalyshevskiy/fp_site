import { db } from './db.js';

// Ключи, которые нельзя отдавать на публичный сайт
const PRIVATE_KEYS = new Set([
  'fusionpos_token', 'fusionpos_base_url', 'pos_driver',
  'max_bot_token', 'max_chat_id', 'max_enabled',
  'yookassa_enabled', 'yookassa_shop_id', 'yookassa_secret_key', 'yookassa_vat_code',
]);

export async function getAllSettings() {
  const rows = await db('settings').select('key', 'value');
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function getPublicSettings() {
  const all = await getAllSettings();
  return Object.fromEntries(Object.entries(all).filter(([k]) => !PRIVATE_KEYS.has(k)));
}

export async function setSettings(patch) {
  const entries = Object.entries(patch);
  for (const [key, value] of entries) {
    await db('settings')
      .insert({ key, value: value == null ? null : String(value) })
      .onConflict('key')
      .merge({ value: value == null ? null : String(value), updated_at: db.fn.now() });
  }
}
