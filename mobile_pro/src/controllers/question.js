/* eslint-disable import/prefer-default-export */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
import helper from 'micro-helper';
import db from '../adapters/db';
import config from '../config';

export const listQuestionBuyerReject = async (req, res) => {
  const { ERR_BAD_REQUEST } = config;
  if (!req.login) {
    return res.status(400).json(ERR_BAD_REQUEST);
  }

  try {
    const list = await db('questions')
      .select('id', 'name', 'type')
      .where('type', 'buyerScanReject')
      .orderBy('order', 'asc');

    return helper.showSuccessOk(res, list);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
