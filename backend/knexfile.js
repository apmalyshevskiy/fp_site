import 'dotenv/config';

/** @type {import('knex').Knex.Config} */
export default {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'fp',
    password: process.env.DB_PASSWORD || 'fp_password',
    database: process.env.DB_NAME || 'fp_site',
    charset: 'utf8mb4',
  },
  migrations: { directory: './migrations' },
  seeds: { directory: './seeds' },
};
