import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import router from './router';

dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());
app.use('/api/v1/admin', router);

app.listen(3000, () => {
  // eslint-disable-next-line no-console
  console.log('app is listening to port 3000');
});
