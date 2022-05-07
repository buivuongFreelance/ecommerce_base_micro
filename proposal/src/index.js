import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import router from './router';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());
app.use('/api/v1/proposal', router);

app.listen(20004, () => {
  // eslint-disable-next-line no-console
  console.log('app is listening to port 20004');
});
