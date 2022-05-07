import express from 'express';
import bodyParser from 'body-parser';
import router from './router';
import cors from 'cors';

require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());
app.use('/api/v1/auth', router);

app.listen(20000, () => {
  // eslint-disable-next-line no-console
  console.log('app is listening to port 20000');
});
