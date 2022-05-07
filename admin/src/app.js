import express from 'express';
import { json } from 'body-parser';
import cookieSession from 'cookie-session';
import 'express-async-errors';

import cors from 'cors';

import { errorHandler, NotFoundError } from '@tomrot/common';
import { devicesRouter } from './routes/devices';
import { ordersRouter } from './routes/orders';
import { orderDeletion } from './routes/orderDeletion';


const app = express();
app.set('trust proxy', true);
app.use(cors())

app.use(json());
app.use(
    cookieSession({
        signed: false,
        secure: true,
    })
);

//Router
app.use(devicesRouter);
app.use(ordersRouter);
app.use(orderDeletion);

app.all('*', async () => {
    throw new NotFoundError();
});

//Error Handler
app.use(errorHandler);

export { app };