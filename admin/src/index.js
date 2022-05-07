import 'express-async-errors';
require('dotenv').config();
import { app } from './app';

const start = async () => {
    if (!process.env.DB_HOST) {
        throw new Error('DB_HOST must be defined');
    }

    if (!process.env.DB_PORT) {
        throw new Error('DB_PORT must be defined');
    }

    if (!process.env.DB_USER) {
        throw new Error('DB_USER must be defined');
    }

    if (!process.env.DB_PASS) {
        throw new Error('DB_PASS must be defined');
    }

    if (!process.env.DB_DATABASE) {
        throw new Error('DB_DATABASE must be defined');
    }
};

app.listen(30001, () => {
    console.log('Example app listening on port 30001!');
});

start();