import helper from 'micro-helper';
import IMEI from 'node-imei';
import db from '../adapters/db';

const checkImei = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { imei } = req.body;
    if (!imei) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    const check = new IMEI();
    if (!check.isValid(imei)) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }
    const tac = imei.toString().substring(0, 8);

    const tacCheck = await db('tacs').first().where('code', tac);
    if (!tacCheck) return helper.showClientBadRequest(res, 'imei not exist');

    const listDetailImei = await db('models')
      .innerJoin('brands', 'models.brand_id', 'brands.id')
      .innerJoin('categories', 'models.category_id', 'categories.id')
      .first(
        'models.device_detail as other_detail',
        'models.id as model_id',
        'models.name as model',
        'models.image_url as model_image_url',
        'brands.id as brand_id',
        'brands.name as brand_name',
        'brands.image_url as brand_image_url',
        'categories.id as category_id',
        'categories.name as category_name',
        'categories.image_url as category_image_url',
      )
      .where('models.id', tacCheck.model_id);
    if (listDetailImei) {
      listDetailImei.imei = imei;
    }
    return helper.showSuccessOk(res, listDetailImei);
    // const listDetailImei = await db('imeis')
    //   .join('colors', 'imeis.color_id', 'colors.id')
    //   .join('rams', 'imeis.ram_id', 'rams.id')
    //   .join('capacities', 'imeis.capacity_id', 'capacities.id')
    //   .join('models', 'imeis.model_id', 'models.id')
    //   .innerJoin('brands', 'models.brand_id', 'brands.id')
    //   .innerJoin('categories', 'models.category_id', 'categories.id')
    //   .first(
    //     'imeis.id as imei_id',
    //     'imeis.other_detail',
    //     'imeis.original_price',
    //     'colors.id as color_id',
    //     'colors.name as color',
    //     'rams.id as ram_id',
    //     'rams.value as ram',
    //     'capacities.id as capacity_id',
    //     'capacities.value as capacity',
    //     'models.id as model_id',
    //     'models.name as model',
    //     'models.image_url as model_image_url',
    //     'brands.id as brand_id',
    //     'brands.name as brand_name',
    //     'brands.image_url as brand_image_url',
    //     'categories.id as category_id',
    //     'categories.name as category_name',
    //     'categories.image_url as category_image_url',
    //   )
    //   .where('imeis.imei', imei);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export default {
  checkImei,
};
