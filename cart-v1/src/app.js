import express from 'express';
import { json } from 'body-parser';
import cookieSession from 'cookie-session';
import 'express-async-errors';

import { errorHandler, NotFoundError } from '@tomrot/common';
import { newCartRouter } from './routes/add_to_cart';
import { listCartRouter } from './routes/list_cart';
import { deleteCartRouter } from './routes/delete_cart';
import { confirmCartRouter } from './routes/confirm_cart';
import cors from 'cors';
import { proposalBuyerCreatedRouter } from './routes/proposal_buyer_created';
import { listProposalRouter } from './routes/list_proposal';
import { proposalSellerRejectedRouter } from './routes/proposal_seller_rejected';
import { deleteProposalRouter } from './routes/delete_proposal';
import { proposalSellerAcceptedRouter } from './routes/proposal_seller_accepted';
import { proposalSellerCancelAcceptedRouter } from './routes/proposal_cancel_accepted';


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
app.use(newCartRouter);
app.use(listCartRouter);
app.use(deleteCartRouter);
app.use(confirmCartRouter);
app.use(proposalBuyerCreatedRouter);
app.use(proposalSellerRejectedRouter);
app.use(proposalSellerAcceptedRouter);
app.use(proposalSellerCancelAcceptedRouter);
app.use(listProposalRouter);
app.use(deleteProposalRouter);

app.all('*', async () => {
    throw new NotFoundError();
});

//Error Handler
app.use(errorHandler);

export { app };