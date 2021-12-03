import express from 'express';
import { json } from 'body-parser';
import cookieSession from 'cookie-session';
import 'express-async-errors';

import { errorHandler, NotFoundError } from '@tomrot/common';
import { listBrandPopularRouter } from './routes/list_brand_popular';
import { listAccountDeviceRouter } from './routes/list_account_device';
import { checkImeiRouter } from './routes/check_imei';
import { listAllRamRouter } from './routes/list_all_ram';
import { listAllColorRouter } from './routes/list_all_color';
import { listAllCapacityRouter } from './routes/list_all_capacity';
import { newDeviceRouter } from './routes/new_device';
import { deleteDeviceRouter } from './routes/delete_device';
import { deviceDetailRouter } from './routes/device_detail';
import { listAllAccessoryRouter } from './routes/list_all_accessory';
import { postDeviceFirstRouter } from './routes/post_device_first';
import { listAllModelByBrandRouter } from './routes/list_all_model_by_brand';
import { postDeviceSecondRouter } from './routes/post_device_second';
import { newDeviceImageRouter } from './routes/new_device_image';
import { deleteDeviceImageRouter } from './routes/delete_device_image';
import { postDeviceWaitingForScanRouter } from './routes/post_device_waiting_for_scan';
import { scanDeviceRouter } from './routes/scan_device';
import { listNewDeviceRouter } from './routes/list_new_device';
import cors from 'cors';

const app = express();
app.use(cors());

app.use(json());
app.use(
    cookieSession({
        signed: false,
        secure: true,
    })
);

//Router
app.use(checkImeiRouter);
app.use(newDeviceRouter);
app.use(postDeviceFirstRouter);
app.use(postDeviceSecondRouter);
app.use(postDeviceWaitingForScanRouter);
app.use(listNewDeviceRouter);
app.use(listAccountDeviceRouter);
app.use(listBrandPopularRouter);
app.use(listAllRamRouter);
app.use(listAllColorRouter);
app.use(listAllCapacityRouter);
app.use(listAllAccessoryRouter);
app.use(listAllModelByBrandRouter);
app.use(deleteDeviceRouter);
app.use(deviceDetailRouter);
app.use(newDeviceImageRouter);
app.use(deleteDeviceImageRouter);
app.use(scanDeviceRouter);

app.all('*', async () => {
    throw new NotFoundError();
});

//Error Handler
app.use(errorHandler);

export { app };