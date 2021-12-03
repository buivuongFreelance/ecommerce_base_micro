import helper from 'micro-helper';
import check from 'is_js';
import db from '../adapters/db';

const create = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const date = new Date();
    const { key, value } = req.body;
    if (!value) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }

    const checkId = await db.first('key').table('settings').where('key', key);
    if (check.existy(checkId)) {
      return helper.showClientBadRequest(res, helper.ERR_EXIST);
    }
    await db('settings').insert({
      key,
      value,
      created_at: date,
      updated_at: date,
    });
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const update = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { id } = req.params;
    const date = new Date();
    const { key, value } = req.body;
    if (!value) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }
    const checkExists = await db.first('id').table('settings').whereNotIn('settings.id', [id]).where('key', key);
    if (checkExists) {
      return helper.showClientBadRequest(res, helper.ERR_EXIST);
    }
    await db('settings').update({ value, key, updated_at: date }).where('id', id);
    return helper.showClientSuccess(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const remove = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { id } = req.params;
    const checkId = await db('settings').first('id').where('id', id);
    if (!check.existy(checkId)) return helper.showClientBadRequest(res, 'ram not exist');
    await db('settings').where('id', id).del();
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const detail = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { id } = req.params;
    const checkId = await db('settings').first('id').where('id', id);
    if (!check.existy(checkId)) return helper.showClientBadRequest(res, 'ram not exist');
    const detailed = await db('settings').first().where('id', id);
    return helper.showSuccessOk(res, detailed);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const listPost = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { limit, offset } = req.body;
    if (!limit) return helper.showClientEmpty(res);
    const listPage = await db
      .select('*')
      .from('settings')
      .limit(limit)
      .offset(offset)
      .orderBy('created_at', 'desc');
    const countRow = await db('settings')
      .count('settings.id', { as: 'count' })
      .first();

    return helper.showSuccessOk(res, {
      list: listPage,
      count: countRow.count,
    });
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
export default {
  listPost,
  create,
  update,
  remove,
  detail,
};
