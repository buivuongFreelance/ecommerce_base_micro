import helper from 'micro-helper';
import check from 'is_js';
import Joi from 'joi';
import db from '../adapters/db';

const create = async (req, res) => {
  try {
    const date = new Date();
    const { key, value, expireDate } = req.body;
    const schema = Joi.object({
      key: Joi.string().required(),
      value: Joi.string().required(),
      expireDate: Joi.string().required(),
    });
    const validation = schema.validate({ key, value, expireDate });
    if (validation.error || validation.errors) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }
    const checkId = await db
      .first('id')
      .table('warranties')
      .where('value', value);
    if (check.existy(checkId)) {
      return helper.showClientBadRequest(res, helper.ERR_EXIST);
    }
    await db('warranties').insert({
      key,
      value,
      expire_date: expireDate,
      created_at: date,
      updated_at: date,
    });
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const date = new Date();
    const { key, value, expireDate } = req.body;
    const schema = Joi.object({
      key: Joi.string().required(),
      value: Joi.string().required(),
      expireDate: Joi.string().required(),
    });
    const validation = schema.validate({ key, value, expireDate });
    if (validation.error || validation.errors) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }
    const checkId = await db('warranties').first('id').where('id', id);
    if (!check.existy(checkId)) {
      return helper.showClientBadRequest(res, 'warranties not exist');
    }
    await db('warranties')
      .update({
        key,
        value,
        expire_date: expireDate,
        updated_at: date,
      })
      .where('id', id);
    return helper.showClientSuccess(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const checkId = await db('warranties').first('id').where('id', id);
    if (!check.existy(checkId)) {
      return helper.showClientBadRequest(res, 'warranties not exist');
    }
    await db('warranties').where('id', id).del();
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const listAll = async (req, res) => {
  try {
    const listall = await db('warranties').select();
    return helper.showSuccessOk(res, listall);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const detail = async (req, res) => {
  try {
    const { id } = req.params;
    const checkId = await db('warranties').first('id').where('id', id);
    if (!check.existy(checkId)) {
      return helper.showClientBadRequest(res, 'warranties not exist');
    }
    const detailed = await db('warranties').select().where('id', id);
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
    const listpage = await db('warranties').limit(limit).offset(offset);
    return helper.showSuccessOk(res, listpage);
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
};
