// Чисто косметическая правка: переносим external_uuid рядом с external_id
// в структуре таблицы (для читаемости в БД-клиентах). На данные и индексы
// не влияет — тип и nullable те же, что и при создании колонки.
export async function up(knex) {
  await knex.raw('ALTER TABLE categories MODIFY COLUMN external_uuid VARCHAR(100) NULL AFTER external_id');
  await knex.raw('ALTER TABLE products MODIFY COLUMN external_uuid VARCHAR(100) NULL AFTER external_id');
}

export async function down(knex) {
  // Порядок колонок не переносим обратно — он не влияет на данные/логику.
}
