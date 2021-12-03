import helper from 'micro-helper';
import { v1 as uuidv1 } from 'uuid';
import check from 'is_js';
import Joi from 'joi';
// import moment from 'moment-timezone';
import db from '../adapters/db';

const create = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { name, colorCode } = req.body;
    const schema = Joi.object({
      name: Joi.string()
        .required()
        .min(3)
        .max(255)
        .pattern(new RegExp(/^[a-zA-Z0-9 ]+$/)),
      colorCode: Joi.string()
        .required()
        .min(6)
        .max(255)
        .pattern(new RegExp(/^[a-zA-Z0-9 ]+$/)),
    });

    const validation = schema.validate({ name, colorCode });
    if (validation.error || validation.errors) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }

    const date = new Date();
    const id = uuidv1();
    const checkName = await db
      .first('name', 'color_code')
      .table('colors')
      .where('name', name);
    if (check.existy(checkName)) {
      return helper.showClientBadRequest(res, helper.ERR_EXIST);
    }

    const checkColorCode = await db
      .first('name', 'color_code')
      .table('colors')
      .where('color_code', colorCode);
    if (check.existy(checkColorCode)) {
      return helper.showClientBadRequest(res, helper.ERR_EXIST);
    }

    if (!name) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    await db('colors').insert({
      id,
      name,
      color_code: colorCode || null,
      created_at: date,
      updated_at: date,
    });
    return helper.showClientSuccess(res, helper.SUCCESS);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error);
    return helper.showServerError(res, error);
  }
};
const update = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { name, colorCode } = req.body;
    const schema = Joi.object({
      name: Joi.string()
        .required()
        .max(255)
        .pattern(new RegExp(/^[a-zA-Z0-9 ]+$/)),
      colorCode: Joi.string()
        .required()
        .max(255)
        .pattern(new RegExp(/^[a-zA-Z0-9 ]+$/)),
    });
    const validation = schema.validate({ name, colorCode });
    if (validation.error || validation.errors) {
      helper.showClientBadRequest(res, helper.ERR_COMMON);
    }
    const { id } = req.params;
    const date = new Date();
    if (!name) helper.showClientEmpty(res);
    const checkId = await db('colors').first('id').where('id', id);
    if (!check.existy(checkId)) {
      return helper.showClientBadRequest(res, 'color not exist');
    }
    await db('colors')
      .update({ name, color_code: colorCode || null, updated_at: date })
      .where('id', '=', id);
    return helper.showClientSuccess(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const remove = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { id } = req.params;
    const checkId = await db('colors').first('id').where('id', id);
    if (!check.existy(checkId)) {
      return helper.showClientBadRequest(res, 'color not exist');
    }
    await db('colors').where('id', id).del();
    return helper.showClientSuccess(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const listAll = async (req, res) => {
  try {
    const listall = await db
      .select()
      .from('colors')
      .orderBy('name', 'asc');

    // listall.forEach((element) => {
    //   const createdAt = moment(element.created_at);
    //   const updatedAt = moment(element.updated_at);
    //   // eslint-disable-next-line no-param-reassign
    //   element.created_at = createdAt
    //     .tz('Asia/Ho_Chi_Minh')
    //     .format('YYYY-MM-DD hh:mm:ss');
    //   // eslint-disable-next-line no-param-reassign
    //   element.updated_at = updatedAt
    //     .tz('Asia/Ho_Chi_Minh')
    //     .format('YYYY-MM-DD hh:mm:ss');
    // });
    return helper.showClientSuccess(res, listall);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const detail = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { id } = req.params;
    const checkId = await db('colors').first('id').where('id', id);
    if (!check.existy(checkId)) {
      return helper.showClientBadRequest(res, 'color not exist');
    }
    const detailed = await db('colors').first().where('id', id);
    return helper.showClientSuccess(res, detailed);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const list = async (req, res) => {
  try {
    const { limit, offset } = req.body;
    if (!limit) return helper.showClientEmpty(res);
    if (!offset) return helper.showClientEmpty(res);
    const listPage = await db
      .select('*')
      .from('colors')
      .limit(limit)
      .offset(offset)
      .orderBy('created_at', 'DESC');
    return helper.showClientSuccess(res, listPage);
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
      .from('colors')
      .limit(limit)
      .offset(offset)
      .orderBy('created_at', 'desc');
    const countRow = await db('colors')
      .count('colors.id', { as: 'count' })
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
