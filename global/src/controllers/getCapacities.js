/* eslint-disable import/prefer-default-export */
import { ServerMicro } from '@mm_organ/common';
import db from '../adapters/db';

export const getCapacities = async (req, res) => {
  try {
    const list = await db('capacities').select('*').orderBy('value', 'asc');
    return ServerMicro.displaySuccess(res, list);
  } catch (error) {
    return ServerMicro.displayServerError(res);
  }
};
