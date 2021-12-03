import {
  QUEUE,
} from '../config';

const Queue = require('bull');

const queue = new Queue(QUEUE.CREATE_ORDER, {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
  },
});

queue.process(async () => {
  try {
    // eslint-disable-next-line no-empty
  } catch (error) {
  }
});

export default queue;
