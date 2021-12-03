import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const db = knex({
  client: 'pg',
  connection: {
    host: '159.89.123.160',
    port: 5433,
    user: 'dingtoi',
    password: 'Y-%"B}9 Z9:6r5o',
    database: 'dingtoi',
  },
});

export default db;
