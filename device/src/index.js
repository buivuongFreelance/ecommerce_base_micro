import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import router from './router';

dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());
app.use('/api/v1/device', router);

app.listen(29996, () => {
  // eslint-disable-next-line no-console
  console.log('app is listening to port 29996');
});
