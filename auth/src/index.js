import express from 'express';
import bodyParser from 'body-parser';
import router from './router';

require('dotenv').config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());
app.use('/api/v1/auth', router);

app.listen(29995, () => {
  // eslint-disable-next-line no-console
  console.log('app is listening to port 29995');
});
