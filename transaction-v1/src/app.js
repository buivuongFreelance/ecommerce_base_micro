import express from 'express';
import { json } from 'body-parser';
import cookieSession from 'cookie-session';
import 'express-async-errors';
import cors from 'cors';

import { errorHandler, NotFoundError } from '@tomrot/common';
import { newOrderRouter } from './routes/new_order';
import { deleteOrderPaidRouter } from './routes/delete_order_paid';
import { detailOrderRouter } from './routes/detail_order';
import { listOrderRouter } from './routes/list_order';
import { listOrderSellerRouter } from './routes/list_order_seller';
import { detailOrderSellerRouter } from './routes/detail_order_seller';
import { updateOrderProcessRouter } from './routes/update_order_process';
import { listTransactionRouter } from './routes/list_transaction';
import { detailTransactionRouter } from './routes/detail_transaction';
import { transactionSellerScanRouter } from './routes/transaction_seller_scan';
import { transactionSellerSubmitPasscodeRouter } from './routes/transaction_seller_submit_passcode';
import { orderSellerCreatePickupRouter } from './routes/transaction_create_pickup';
import { transactionBuyerScanRouter } from './routes/transaction_buyer_scan';
import { transactionBuyerAcceptRouter } from './routes/transaction_buyer_accept';


const app = express();
app.use(cors());
app.set('trust proxy', true);

app.use(json());
app.use(
    cookieSession({
        signed: false,
        secure: true,
    })
);

//Router
app.use(listOrderRouter);
app.use(newOrderRouter);
app.use(updateOrderProcessRouter);
app.use(deleteOrderPaidRouter);
app.use(detailOrderRouter);
app.use(listOrderSellerRouter);
app.use(detailOrderSellerRouter);
app.use(listTransactionRouter);
app.use(detailTransactionRouter);
app.use(transactionSellerScanRouter);
app.use(transactionSellerSubmitPasscodeRouter);
app.use(transactionBuyerScanRouter);
app.use(transactionBuyerAcceptRouter);
app.use(orderSellerCreatePickupRouter);


app.all('*', async () => {
    throw new NotFoundError();
});

//Error Handler
app.use(errorHandler);

export { app };