import knex from 'knex';
import dotenv from 'dotenv';

const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASS,
  DB_DATABASE,
} = process.env;

dotenv.config();

const db = knex({
  client: 'pg',
  connection: {
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    database: DB_DATABASE,
  },
});

export default db;
