import helper from 'micro-helper';
import { v1 as uuidv1 } from 'uuid';
import check from 'is_js';
import Joi from 'joi';
import db from '../adapters/db';

const create = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const id = uuidv1();
    const date = new Date();
    const {
      name, imageUrl, brandId, categoryId,
    } = req.body;
    const schema = Joi.object({
      name: Joi.string()
        .required()
        .min(3)
        .max(255)
        .pattern(new RegExp(/^[a-zA-Z0-9 ]+$/)),
      imageUrl: Joi.string()
        .allow('')
        .pattern(new RegExp(/^[a-zA-Z0-9 ]+$/)),
      brandId: Joi.string()
        .required()
        .min(8)
        .max(255)
        .pattern(new RegExp(/^[a-zA-Z0-9- ]+$/)),
      categoryId: Joi.string()
        .required()
        .min(8)
        .max(255)
        .pattern(new RegExp(/^[a-zA-Z0-9- ]+$/)),
    });
    const validation = schema.validate({
      name,
      imageUrl,
      brandId,
      categoryId,
    });
    if (validation.error || validation.errors) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }
    const checkId = await db.first('name').table('models').where('name', name);
    if (check.existy(checkId)) {
      return helper.showClientBadRequest(res, helper.ERR_EXIST);
    }
    await db('models').insert({
      id,
      name,
      image_url: imageUrl || null,
      brand_id: brandId,
      category_id: categoryId,
      created_at: date,
      updated_at: date,
    });

    return helper.showSuccessOk(res, 'success');
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const update = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { id } = req.params;
    const date = new Date();
    const {
      name, imageUrl, brandId, categoryId,
    } = req.body;
    const schema = Joi.object({
      name: Joi.string()
        .required()
        .min(3)
        .max(255)
        .pattern(new RegExp(/^[a-zA-Z0-9 ]+$/)),
      imageUrl: Joi.string()
        .allow('')
        .max(255)
        .pattern(new RegExp(/^[a-zA-Z0-9- ]+$/)),
      brandId: Joi.string()
        .required()
        .min(8)
        .max(255)
        .pattern(new RegExp(/^[a-zA-Z0-9- ]+$/)),
      categoryId: Joi.string()
        .required()
        .min(8)
        .max(255)
        .pattern(new RegExp(/^[a-zA-Z0-9- ]+$/)),
    });

    const validation = schema.validate({
      name,
      imageUrl,
      brandId,
      categoryId,
    });
    if (validation.error || validation.errors) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }

    await db('models')
      .update({
        name,
        image_url: imageUrl || null,
        brand_id: brandId,
        category_id: categoryId,
        updated_at: date,
      })
      .where('id', '=', id);

    return helper.showSuccessOk(res, 'success');
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const remove = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { id } = req.params;
    if (!id) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    const checkId = await db('models').first('id').where('id', id);
    if (!check.existy(checkId)) return helper.showClientBadRequest(res, 'model not exist');
    await db('models').where('id', id).del();
    return helper.showSuccessOk(res, 'success');
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const listAll = async (req, res) => {
  try {
    const listAllModels = await db('models')
      .join('brands', 'models.brand_id', 'brands.id')
      .join('categories', 'models.category_id', 'categories.id')
      .select(
        'models.id as model_id',
        'models.name as model_name',
        'models.image_url as model_image_url',
        'brands.id as brand_id',
        'brands.name as brand_name',
        'brands.image_url as brand_image_url',
        'categories.id as category_id',
        'categories.name as category_name',
        'categories.image_url as category_image_url',
      );
    return helper.showClientSuccess(res, listAllModels);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const detail = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { id } = req.params;
    if (!id) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    const checkId = await db('models').first('id').where('id', id);
    if (!check.existy(checkId)) return helper.showClientBadRequest(res, 'model not exist');
    const getDetailId = await db('models')
      .join('brands', 'models.brand_id', 'brands.id')
      .join('categories', 'models.category_id', 'categories.id')
      .first(
        'models.id as model_id',
        'models.name as model_name',
        'models.image_url as model_image_url',
        'brands.id as brand_id',
        'brands.name as brand_name',
        'brands.image_url as brand_image_url',
        'categories.id as category_id',
        'categories.name as category_name',
        'categories.image_url as category_image_url',
      )
      .where('models.id', id);
    return helper.showClientSuccess(res, getDetailId);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const list = async (req, res) => {
  try {
    const {
      limit, offset, filter, brandId,
    } = req.body;

    if (!limit) return helper.showClientEmpty(res);
    const { modelName } = filter;

    const listModel = await db('models')
      .join('brands', 'models.brand_id', 'brands.id')
      .join('categories', 'models.category_id', 'categories.id')
      .select(
        'models.id as model_id',
        'models.name as model_name',
        'models.image_url as model_image_url',
        'brands.id as brand_id',
        'brands.name as brand_name',
        'categories.id as category_id',
        'categories.name as category_name',
      )
      .where('models.name', 'ILIKE', `%${modelName}%`)
      .where('brands.id', brandId)
      .limit(limit)
      .offset(offset);
    const countRow = await db('models')
      .join('brands', 'models.brand_id', 'brands.id')
      .join('categories', 'models.category_id', 'categories.id')
      .count('models.id', { as: 'count' })
      .where('models.name', 'ILIKE', `%${modelName}%`)
      .where('brands.id', brandId)
      .first();
    return helper.showSuccessOk(res, {
      list: listModel,
      count: countRow.count,
    });
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const listExclude = async (req, res) => {
  try {
    const {
      limit, offset, filter, brandId, ids,
    } = req.body;

    if (!limit) return helper.showClientEmpty(res);
    const { modelName } = filter;

    const listModel = await db('models')
      .join('brands', 'models.brand_id', 'brands.id')
      .join('categories', 'models.category_id', 'categories.id')
      .select(
        'models.id as model_id',
        'models.name as model_name',
        'models.image_url as model_image_url',
        'brands.id as brand_id',
        'brands.name as brand_name',
        'categories.id as category_id',
        'categories.name as category_name',
      )
      .where('models.name', 'ILIKE', `%${modelName}%`)
      .where('brands.id', brandId)
      .whereNotIn('models.id', ids)
      .limit(limit)
      .offset(offset);
    const countRow = await db('models')
      .join('brands', 'models.brand_id', 'brands.id')
      .join('categories', 'models.category_id', 'categories.id')
      .count('models.id', { as: 'count' })
      .where('models.name', 'ILIKE', `%${modelName}%`)
      .where('brands.id', brandId)
      .whereNotIn('models.id', ids)
      .first();
    return helper.showSuccessOk(res, {
      list: listModel,
      count: countRow.count,
    });
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const listPost = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { limit, offset, filter } = req.body;

    const { modelName } = filter;
    if (!limit) return helper.showClientEmpty(res);
    const listModel = await db('models')
      .join('brands', 'models.brand_id', 'brands.id')
      .join('categories', 'models.category_id', 'categories.id')
      .select(
        'models.id as id',
        'models.name as model_name',
        'models.image_url as model_image_url',
        'brands.id as brand_id',
        'brands.name as brand_name',
        'categories.id as category_id',
        'categories.name as category_name',
        'models.updated_at as updated_at',
      )
      .where('models.name', 'ILIKE', `%${modelName}%`)
      .limit(limit)
      .offset(offset);
    const countRow = await db('models')
      .join('brands', 'models.brand_id', 'brands.id')
      .join('categories', 'models.category_id', 'categories.id')
      .where('models.name', 'ILIKE', `%${modelName}%`)
      .count('models.id', { as: 'count' })
      .first();
    return helper.showSuccessOk(res, {
      list: listModel,
      count: countRow.count,
    });
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const listSettings = async (req, res) => {
  try {
    const l = await db('settings')
      .select('*');
    return helper.showSuccessOk(res, l);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export const listQuestionSellerReject = async (req, res) => {
  try {
    const listQ = await db('questions')
      .select()
      .where('type', 'sellerReject')
      .orderBy('order', 'asc');
    return helper.showSuccessOk(res, { list: listQ });
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export const listQuestionBuyerReject = async (req, res) => {
  try {
    const listQ = await db('questions')
      .select()
      .where('type', 'buyerScanReject')
      .orderBy('order', 'asc');
    return helper.showSuccessOk(res, { list: listQ });
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
  listExclude,
  listSettings,
  listPost,
};
