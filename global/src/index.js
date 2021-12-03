import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import router from './router';

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());
app.use('/api/v1/global', router);

const start = async () => {

};

app.listen(3000, () => {
  // eslint-disable-next-line no-console
  console.log('app is listening to port 3000');
});

start();
