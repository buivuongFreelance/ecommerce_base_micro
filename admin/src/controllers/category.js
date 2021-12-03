import helper from 'micro-helper';
import { v1 as uuidv1 } from 'uuid';
import check from 'is_js';
import db from '../adapters/db';

const create = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const id = uuidv1();
    const date = new Date();
    const { name, imageUrl } = req.body;
    if (!name) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }
    const checkId = await db
      .first('name')
      .table('categories')
      .where('name', name);
    if (check.existy(checkId)) {
      return helper.showClientBadRequest(res, helper.ERR_EXIST);
    }
    await db('categories').insert({
      id,
      name,
      image_url: imageUrl || null,
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
    const { name, imageUrl } = req.body;
    if (!name) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }
    const checkId = await db('categories').first('id').where('id', id);
    if (!check.existy(checkId)) {
      return helper.showClientBadRequest(res, helper.ERR_EXIST);
    }
    await db('categories')
      .update({
        name,
        image_url: imageUrl || null,
        updated_at: date,
      })
      .where('id', id);
    return helper.showClientSuccess(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const remove = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { id } = req.params;
    const checkId = await db('categories').first('id').where('id', id);
    if (!check.existy(checkId)) {
      return helper.showClientBadRequest(res, 'category not exist');
    }
    await db('categories').where('id', id).del();
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const listAll = async (req, res) => {
  try {
    const listall = await db('categories').select();
    return helper.showSuccessOk(res, listall);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const detail = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { id } = req.params;
    const checkId = await db('categories').first('id').where('id', id);
    if (!check.existy(checkId)) {
      return helper.showClientBadRequest(res, helper.ERR_EXIST);
    }
    const detailed = await db('categories').first().where('id', id);
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
    const listpage = await db('categories').limit(limit).offset(offset);
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
      .from('categories')
      .limit(limit)
      .offset(offset)
      .orderBy('created_at', 'desc');
    const countRow = await db('categories')
      .count('categories.id', { as: 'count' })
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
