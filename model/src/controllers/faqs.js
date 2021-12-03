/* eslint-disable import/prefer-default-export */
import helper from 'micro-helper';
import db from '../adapters/db';

export const listFaqs = async (req, res) => {
  try {
    const list = await db('faqs')
      .select()
      .orderBy('created_at', 'desc');

    return helper.showSuccessOk(res, list);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
