/* eslint-disable import/prefer-default-export */
import helper from 'micro-helper';
import db from '../adapters/db';

export const listCityByStateAndCountry = async (req, res) => {
  const { countryId, stateCode } = req.body;
  try {
    const list = await db('cities').where({
      country_id: countryId,
      state_code: stateCode,
    });
    return helper.showSuccessOk(res, list);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export const getCityByName = async (req, res) => {
  const { name } = req.params;

  const newName = name.toUpperCase();
  try {
    const city = await db('cities').first().where({
      name: newName,
    });
    return helper.showSuccessOk(res, city);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
