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
    const checkId = await db
      .first('value')
      .table('capacities')
      .where('value', value);
    if (checkId) {
      return helper.showClientBadRequest(res, helper.ERR_EXIST);
    }
    await db('capacities').insert({
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
    const checkId = await db('capacities').first('id').where('id', id);
    if (!checkId) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }
    const checkValue = await db
      .first('id')
      .table('capacities')
      .where('value', value);
    if (checkValue) {
      return helper.showClientBadRequest(res, helper.ERR_EXIST);
    }
    await db('capacities').update({ value, updated_at: date }).where('id', id);
    return helper.showClientSuccess(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const remove = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { id } = req.params;
    const checkId = await db('capacities').first('id').where('id', id);
    if (!check.existy(checkId)) {
      return helper.showClientBadRequest(res, 'capacity not exist');
    }
    await db('capacities').where('id', id).del();
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const listAll = async (req, res) => {
  try {
    const listall = await db('capacities').select().orderBy('value', 'asc');
    return helper.showSuccessOk(res, listall);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const detail = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { id } = req.params;
    const checkId = await db('capacities').first('id').where('id', id);
    if (!check.existy(checkId)) {
      return helper.showClientBadRequest(res, 'capacity not exist');
    }
    const detailed = await db('capacities').first().where('id', id);
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
    const listpage = await db('capacities').limit(limit).offset(offset);
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
      .from('capacities')
      .limit(limit)
      .offset(offset)
      .orderBy('created_at', 'desc');
    const countRow = await db('capacities')
      .count('capacities.id', { as: 'count' })
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
