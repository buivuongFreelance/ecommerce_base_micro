import helper from 'micro-helper';
import { v1 as uuidv1 } from 'uuid';
import check from 'is_js';
import Joi from 'joi';
import db from '../adapters/db';

const create = async (req, res) => {
  try {
    const id = uuidv1();
    const date = new Date();
    const { name, imageUrl, publicId } = req.body;
    const schema = Joi.object({
      name: Joi.string()
        .required()
        .min(3)
        .max(255)
        .pattern(new RegExp(/^[a-zA-Z0-9 ]+$/)),
      imageUrl: Joi.string()
        .required()
        .max(255)
        .pattern(new RegExp(/^[a-zA-Z0-9 ]+$/)),
      publicId: Joi.string()
        .required()
        .max(255)
        .pattern(new RegExp(/^[a-zA-Z0-9 ]+$/)),
    });
    const validation = schema.validate({ name, imageUrl, publicId });
    if (validation.error || validation.errors) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }
    const checkId = await db.first('name').table('banners').where('name', name);
    if (check.existy(checkId)) {
      return helper.showClientBadRequest(res, helper.ERR_EXIST);
    }
    await db('banners').insert({
      id,
      name,
      image_url: imageUrl || null,
      public_id: publicId || null,
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
    const { name, imageUrl, publicId } = req.body;
    const schema = Joi.object({
      name: Joi.string()
        .required()
        .min(3)
        .max(255)
        .pattern(new RegExp(/^[a-zA-Z0-9 ]+$/)),
      imageUrl: Joi.string()
        .required()
        .min(6)
        .max(255)
        .pattern(new RegExp(/^[a-zA-Z0-9 ]+$/)),
      publicId: Joi.string()
        .required()
        .min(6)
        .max(255)
        .pattern(new RegExp(/^[a-zA-Z0-9 ]+$/)),
    });
    const validation = schema.validate({ name, imageUrl, publicId });
    if (validation.error || validation.errors) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }
    const checkId = await db('banners').first('id').where('id', id);
    if (!check.existy(checkId)) {
      return helper.showClientBadRequest(res, 'banner not exist');
    }
    await db('banners')
      .update({
        name,
        image_url: imageUrl || null,
        public_id: publicId || null,
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
    const checkId = await db('banners').first('id').where('id', id);
    if (!check.existy(checkId)) {
      return helper.showClientBadRequest(res, 'banner not exist');
    }
    await db('banners').where('id', id).del();
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const listAll = async (req, res) => {
  try {
    const listall = await db('banners').select();
    return helper.showSuccessOk(res, listall);
  } catch (error) {
    console.log('error', error);
    return helper.showServerError(res, error);
  }
};
const detail = async (req, res) => {
  try {
    const { id } = req.params;
    const checkId = await db('banners').first('id').where('id', id);
    if (!check.existy(checkId)) {
      return helper.showClientBadRequest(res, 'banner not exist');
    }
    const detailed = await db('banners').select().where('id', id);
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
    const listpage = await db('banners').limit(limit).offset(offset);
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
