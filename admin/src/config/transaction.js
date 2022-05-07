import db from '../adapters/db';

export const queryNotTransactionSell = () => db('transactions')
    .select('transactions.device_id');

export const queryNotTransactionExchange = () => db('transactions_exchange')
    .select('device_id');