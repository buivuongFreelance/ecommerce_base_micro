import express from 'express';
import bodyParser from 'body-parser';
import router from './router';

require('dotenv').config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());
app.use(process.env.DOMAIN_DRIVEN, router);

app.listen(process.env.NODE_PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`app is listening to port ${process.env.NODE_PORT}`);
});
