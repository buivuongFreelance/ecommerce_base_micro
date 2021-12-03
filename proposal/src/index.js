import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import router from './router';

dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());
app.use('/api/v1/proposal', router);

app.listen(29998, () => {
  // eslint-disable-next-line no-console
  console.log('app is listening to port 29998');
});
