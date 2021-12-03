import helper from 'micro-helper';
import check from 'is_js';
import db from '../adapters/db';

const create = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const date = new Date();
    const { key, value, order } = req.body;
    if (!key || !value || !order) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }

    const checkId = await db
      .first('id')
      .table('accessories')
      .where('value', value);
    if (check.existy(checkId)) {
      return helper.showClientBadRequest(res, helper.ERR_EXIST);
    }

    const checkKey = await db
      .first('id')
      .table('accessories')
      .where('key', key);
    if (check.existy(checkKey)) {
      return helper.showClientBadRequest(res, helper.ERR_EXIST);
    }
    await db('accessories').insert({
      key,
      value,
      order,
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
    const { key, value, order } = req.body;
    if (!key || !value || !order) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }
    const checkKey = await db.first('id').table('accessories').whereNotIn('accessories.id', [id]).where('key', key);
    if (checkKey) {
      return helper.showClientBadRequest(res, helper.ERR_EXIST);
    }
    await db('accessories').update({ key, value, updated_at: date }).where('id', id);
    return helper.showClientSuccess(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const remove = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { id } = req.params;
    const checkId = await db('accessories').first('id').where('id', id);
    if (!check.existy(checkId)) {
      return helper.showClientBadRequest(res, 'accessories not exist');
    }
    await db('accessories').where('id', id).del();
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const listAll = async (req, res) => {
  try {
    const listall = await db('accessories').select().orderBy('order', 'asc');
    return helper.showSuccessOk(res, listall);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const detail = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { id } = req.params;
    const checkId = await db('accessories').first('id').where('id', id);
    if (!check.existy(checkId)) {
      return helper.showClientBadRequest(res, 'accessories not exist');
    }
    const detailed = await db('accessories').first().where('id', id);
    return helper.showSuccessOk(res, detailed);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const list = async (req, res) => {
  try {
    const { limit, offset } = req.body;
    if (!limit) return helper.showClientEmpty(res);
    if (!offset) return helper.showClientEmpty(res);
    const listpage = await db('accessories').limit(limit).offset(offset);
    return helper.showSuccessOk(res, listpage);
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
      .from('accessories')
      .limit(limit)
      .offset(offset)
      .orderBy('created_at', 'desc');
    const countRow = await db('accessories')
      .count('accessories.id', { as: 'count' })
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
  create,
  update,
  remove,
  listAll,
  detail,
  list,
  listPost,
};
