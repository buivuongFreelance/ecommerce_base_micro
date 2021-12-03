import helper from 'micro-helper';
import { v1 as uuidv1 } from 'uuid';
import check from 'is_js';
import db from '../adapters/db';

const create = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const id = uuidv1();
    const date = new Date();
    const { value } = req.body;
    if (!value) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }

    const checkId = await db.first('value').table('rams').where('value', value);
    if (check.existy(checkId)) {
      return helper.showClientBadRequest(res, helper.ERR_EXIST);
    }
    await db('rams').insert({
      id,
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
    const { value } = req.body;
    if (!value) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }
    const checkId = await db('rams').first('id').where('id', id);
    if (!check.existy(checkId)) return helper.showClientBadRequest(res, helper.ERR_EXIST);
    const checkValue = await db
      .first('id')
      .table('rams')
      .where('value', value);
    if (checkValue) {
      return helper.showClientBadRequest(res, helper.ERR_EXIST);
    }
    await db('rams').update({ value, updated_at: date }).where('id', id);
    return helper.showClientSuccess(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const remove = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { id } = req.params;
    const checkId = await db('rams').first('id').where('id', id);
    if (!check.existy(checkId)) return helper.showClientBadRequest(res, 'ram not exist');
    await db('rams').where('id', id).del();
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const listAll = async (req, res) => {
  try {
    const listall = await db('rams').select().orderBy('value', 'asc');
    return helper.showSuccessOk(res, listall);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const detail = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { id } = req.params;
    const checkId = await db('rams').first('id').where('id', id);
    if (!check.existy(checkId)) return helper.showClientBadRequest(res, 'ram not exist');
    const detailed = await db('rams').first().where('id', id);
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
    const listpage = await db('rams').limit(limit).offset(offset);
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
      .from('rams')
      .limit(limit)
      .offset(offset)
      .orderBy('created_at', 'desc');
    const countRow = await db('rams')
      .count('rams.id', { as: 'count' })
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
  listAll,
  detail,
  list,
};
