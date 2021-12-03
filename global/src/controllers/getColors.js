/* eslint-disable import/prefer-default-export */
import { ServerMicro } from '@mm_organ/common';
import db from '../adapters/db';

export const getColors = async (req, res) => {
  try {
    const list = await db('colors').select('*').orderBy('name', 'asc');
    return ServerMicro.displaySuccess(res, list);
  } catch (error) {
    return ServerMicro.displayServerError(res);
  }
};
