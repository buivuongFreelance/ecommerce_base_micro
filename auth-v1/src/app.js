import express from 'express';
import { json } from 'body-parser';
import cookieSession from 'cookie-session';
import 'express-async-errors';

// import { currentUserRouter } from './routes/current_user';
import { signinRouter } from './routes/signin';
import { signoutRouter } from './routes/signout';
import { signupRouter } from './routes/signup';
import { errorHandler } from '@tomrot/common';
import { NotFoundError } from '@tomrot/common';
import { listAllCountryRouter } from './routes/list_all_country';
import { listAllStateByCountryRouter } from './routes/list_all_state_by_country';
import { listAllCityByCountryStateRouter } from './routes/list_all_city_by_country_state';
import { newShippingAddressRouter } from './routes/new_shipping_address';
import { shippingAddressDetailRouter } from './routes/detail_shipping_address';
import { updateShippingAddressRouter } from './routes/update_shipping_address';
import { newBillingAddressRouter } from './routes/new_billing_address';
import { updateBillingAddressRouter } from './routes/update_billing_address';
import { billingAddressDetailRouter } from './routes/detail_billing_address';
import cors from 'cors';

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
app.use(signinRouter);
app.use(signoutRouter);
app.use(signupRouter);
app.use(listAllCountryRouter);
app.use(listAllStateByCountryRouter);
app.use(listAllCityByCountryStateRouter);
app.use(newShippingAddressRouter);
app.use(updateShippingAddressRouter);
app.use(shippingAddressDetailRouter);
app.use(newBillingAddressRouter);
app.use(updateBillingAddressRouter);
app.use(billingAddressDetailRouter);

app.all('*', async () => {
    throw new NotFoundError();
});

//Error Handler
app.use(errorHandler);

export { app };