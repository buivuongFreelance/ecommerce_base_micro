import helper from 'micro-helper';
import db from '../adapters/db';

const listAll = async (req, res) => {
  try {
    const getall = await db('countries').select();
    return helper.showSuccessOk(res, getall);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const detail = async (req, res) => {
  try {
    const { id } = req.params;
    const detailed = await db('countries').first().where('id', id);
    return helper.showSuccessOk(res, detailed);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
export default { listAll, detail };
