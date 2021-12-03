import helper from 'micro-helper';
import db from '../adapters/db';

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const checkid = await db('credit_cards').where({ id }).first();
    if (!checkid) return helper.showClientBadRequest(res, 'credit card not exist');
    await db('credit_cards').where({ id }).del();
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const listAll = async (req, res) => {
  try {
    const getAll = await db('credit_cards').select();
    return helper.showSuccessOk(res, getAll);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const detail = async (req, res) => {
  try {
    const { id } = req.params;
    const getOne = await db('credit_cards').first().where({ id });
    if (!getOne) return helper.showClientBadRequest(res, 'credit card not exist');
    return helper.showSuccessOk(res, getOne);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
export default { remove, listAll, detail };
