/* eslint-disable import/prefer-default-export */
import helper from 'micro-helper';
import db from '../adapters/db';

export const listStateByCountry = async (req, res) => {
  const { countryId } = req.body;
  try {
    const list = await db('states').select().where('states.country_id', countryId);
    return helper.showSuccessOk(res, list);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
