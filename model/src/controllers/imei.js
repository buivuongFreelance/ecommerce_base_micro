import helper from 'micro-helper';
import { v1 as uuidv1 } from 'uuid';
import db from '../adapters/db';

// import imeiDb from '../adapters/imeiDb.json';

export const generateImei = async (req, res) => {
  // const rows = [];
  const date = new Date();
  // eslint-disable-next-line array-callback-return
  // imeiDb.map((tac) => {
  //   if (tac.type === 'Smartphone') {
  //     let deviceName = tac.name;
  //     deviceName = deviceName.replace(/ /g, '-');

  //     rows.push({
  //       id: uuidv1(),
  //       name: tac.name,
  //       image_url: `https://fdn2.gsmarena.com/vv/bigpic/${deviceName}.jpg`.toLowerCase(),
  //       brand_id: '954b2506-4f05-4c67-b5c5-ddafa612fd9a',
  //       category_id: '4063bdd7-9ceb-4698-8e25-bb1893ce864f',
  //       created_at: date,
  //       updated_at: date,
  //       tac: tac.tac,
  //       device_id: tac.device_id,
  //       physical_shipping: {
  //         length: '5',
  //         width: '5',
  //         height: '5',
  //         distance_unit: 'in',
  //         weight: '2',
  //         mass_unit: 'lb',
  //       },
  //     });
  //   }
  // });

  // rows.push({
  //   id: uuidv1(),
  //   name: 'Samsung Galaxy J7 Prime',
  //   image_url: 'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-j7-prime.jpg',
  //   brand_id: 'db3554c6-1f40-4c01-8087-3507529d9512',
  //   category_id: '4063bdd7-9ceb-4698-8e25-bb1893ce864f',
  //   created_at: date,
  //   updated_at: date,
  //   device_id: '8314',
  //   physical_shipping: {
  //     length: '5',
  //     width: '5',
  //     height: '5',
  //     distance_unit: 'in',
  //     weight: '2',
  //     mass_unit: 'lb',
  //   },
  //   device_detail: null,
  // });

  // rows.push({
  //   id: uuidv1(),
  //   name: 'Samsung Galaxy A20',
  //   image_url: 'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a20.jpg',
  //   brand_id: 'db3554c6-1f40-4c01-8087-3507529d9512',
  //   category_id: '4063bdd7-9ceb-4698-8e25-bb1893ce864f',
  //   created_at: date,
  //   updated_at: date,
  //   device_id: '9640',
  //   physical_shipping: {
  //     length: '5',
  //     width: '5',
  //     height: '5',
  //     distance_unit: 'in',
  //     weight: '2',
  //     mass_unit: 'lb',
  //   },
  //   device_detail: null,
  // });

  // rows.push({
  //   id: uuidv1(),
  //   name: 'Apple iPhone 6s Plus',
  //   image_url: 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-6s-plus.jpg',
  //   brand_id: '954b2506-4f05-4c67-b5c5-ddafa612fd9a',
  //   category_id: '4063bdd7-9ceb-4698-8e25-bb1893ce864f',
  //   created_at: date,
  //   updated_at: date,
  //   device_id: '9640',
  //   physical_shipping: {
  //     length: '5',
  //     width: '5',
  //     height: '5',
  //     distance_unit: 'in',
  //     weight: '2',
  //     mass_unit: 'lb',
  //   },
  //   device_detail: null,
  // });

  const rows = [
    {
      code: '35346608', model_id: '1e684e40-43a1-11eb-9e0f-bdffb4071a5c', created_at: date, updated_at: date,
    },
    {
      code: '35474208', model_id: '1e684e40-43a1-11eb-9e0f-bdffb4071a5c', created_at: date, updated_at: date,
    },
    {
      code: '35824210', model_id: 'ab9fbbe0-43a1-11eb-9c4b-63f086169261', created_at: date, updated_at: date,
    },
    {
      code: '35746310', model_id: 'ab9fbbe0-43a1-11eb-9c4b-63f086169261', created_at: date, updated_at: date,
    },
    {
      code: '35329207', model_id: 'ab9fe2f0-43a1-11eb-9c4b-63f086169261', created_at: date, updated_at: date,
    },
  ];

  await db.transaction(async (trx) => {
    // await trx.batchInsert('models', rows, 1000000);
    await trx.batchInsert('tacs', rows, 1000000);
  });
  return helper.showSuccessOk(res, helper.SUCCESS);
};

const remove = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { id } = req.params;
    if (!id) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    await db('imeis').where('id', id).del();
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const create = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const id = uuidv1();
    const date = new Date();
    const {
      imei, modelId, ramId, capacityId, colorId, otherDetail,
    } = req.body;
    if (!imei || !modelId || !ramId || !capacityId || !colorId) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }
    const checkImei = await db.first('imei').table('imeis').where('imei', imei);
    if (checkImei) {
      return helper.showClientBadRequest(res, helper.ERR_EXIST);
    }

    await db('imeis').insert({
      id,
      imei,
      model_id: modelId,
      color_id: colorId,
      ram_id: ramId,
      capacity_id: capacityId,
      other_detail: otherDetail,
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
    const {
      imei, modelId, ramId, capacityId, colorId, otherDetail,
    } = req.body;
    if (!imei || !modelId || !ramId || !capacityId || !colorId) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }

    const checkImei = await db.first('imei').table('imeis').whereNotIn('imeis.id', [id]).where('imei', imei);
    if (checkImei) {
      return helper.showClientBadRequest(res, helper.ERR_EXIST);
    }
    await db('imeis').update({
      imei,
      model_id: modelId,
      color_id: colorId,
      ram_id: ramId,
      capacity_id: capacityId,
      other_detail: otherDetail,
      updated_at: date,
    }).where('id', id);
    return helper.showSuccessOk(res, helper.SUCCESS);
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
    const list = await db('imeis')
      .innerJoin('models', 'models.id', 'imeis.model_id')
      .join('brands', 'models.brand_id', 'brands.id')
      .join('categories', 'models.category_id', 'categories.id')
      .select(
        'imeis.id as id',
        'imeis.imei as imei',
        'models.name as model_name',
        'models.image_url as model_image_url',
        'brands.id as brand_id',
        'brands.name as brand_name',
        'categories.id as category_id',
        'categories.name as category_name',
        'imeis.updated_at as updated_at',
      )
      .where('models.name', 'ILIKE', `%${modelName}%`)
      .limit(limit)
      .offset(offset)
      .orderBy('imeis.created_at', 'desc');
    const countRow = await db('imeis')
      .innerJoin('models', 'models.id', 'imeis.model_id')
      .join('brands', 'models.brand_id', 'brands.id')
      .join('categories', 'models.category_id', 'categories.id')
      .where('models.name', 'ILIKE', `%${modelName}%`)
      .count('models.id', { as: 'count' })
      .first();
    return helper.showSuccessOk(res, {
      list,
      count: countRow.count,
    });
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const detail = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { id } = req.params;
    if (!id) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    const checkId = await db('imeis').first('id').where('id', id);
    if (!checkId) return helper.showServerError(res, '');
    const getDetailId = await db('imeis')
      .first(
        'id',
        'model_id',
        'ram_id',
        'capacity_id',
        'color_id',
        'imei',
        'other_detail',
      )
      .where('imeis.id', id);
    return helper.showClientSuccess(res, getDetailId);
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
