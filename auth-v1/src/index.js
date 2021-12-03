import 'express-async-errors';
require('dotenv').config();

import { app } from './app';

const start = async () => {
    if (!process.env.JWT_KEY) {
        throw new Error('JWT_KEY must be defined');
    }
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

    if (!process.env.SHIPPO_TOKEN) {
        throw new Error('SHIPPO_TOKEN must be defined');
    }

    if (!process.env.STRIPE_API_KEY) {
        throw new Error('STRIPE_API_KEY must be defined');
    }
};

app.listen(10004, () => {
    console.log('Example app listening on port 10004!');
});

start();