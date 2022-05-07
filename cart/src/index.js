import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import cors from 'cors';
import router from './router';

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());
app.use('/api/v1/cart', router);

app.listen(20002, () => {
  // eslint-disable-next-line no-console
  console.log('app is listening to port 20002');
});
