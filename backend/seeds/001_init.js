import bcrypt from 'bcryptjs';

const DEFAULT_SETTINGS = {
  site_name: 'Мой ресторан',
  site_tagline: 'Вкусная еда с доставкой',
  logo_url: '',
  header_image_url: '',
  phone: '+7 (900) 000-00-00',
  address: 'г. Москва, ул. Примерная, 1',
  work_hours: 'Ежедневно 10:00–22:00',
  pickup_enabled: 'true',
  delivery_enabled: 'true',
  delivery_fee: '200',
  delivery_free_from: '2000',
  delivery_min_order: '500',
  accent_color: '#e8590c',
};

export async function seed(knex) {
  // Настройки: добавляем только отсутствующие ключи, ничего не перезаписываем
  const existing = await knex('settings').pluck('key');
  const rows = Object.entries(DEFAULT_SETTINGS)
    .filter(([key]) => !existing.includes(key))
    .map(([key, value]) => ({ key, value }));
  if (rows.length) await knex('settings').insert(rows);

  // Администратор из .env, если его ещё нет
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const admin = await knex('admin_users').where({ email }).first();
  if (!admin) {
    await knex('admin_users').insert({
      email,
      password_hash: bcrypt.hashSync(password, 10),
    });
  }
}
