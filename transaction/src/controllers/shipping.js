import helper from 'micro-helper';
import { v1 as uuidv1 } from 'uuid';
import db from '../adapters/db';
import { TRANSACTION_STATUS } from '../config';

const getShippingAndBillingLast = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { userId } = req;
  try {
    const shipping = await db('shippings')
      .innerJoin('cities', 'cities.id', 'shippings.city_id')
      .innerJoin('countries', 'countries.id', 'shippings.country_id')
      .first('shippings.id', 'first_name', 'last_name', 'address',
        'zip as postal_code', 'phone as phone_number', 'shippings.country_id', 'countries.country_code_alpha2 as country_code',
        'city_id as city', 'cities.name as city_name', 'shippings.state_code as province')
      .where('user_id', userId)
      .orderBy('shippings.created_at', 'DESC');
    const billing = await db('billings')
      .innerJoin('cities', 'cities.id', 'billings.city_id')
      .first('billings.id', 'first_name', 'last_name', 'billings.address',
        'billings.zip as postal_code', 'billings.phone as phone_number', 'billings.country_id',
        'city_id as city', 'cities.name as city_name', 'billings.state_code as province')
      .orderBy('billings.created_at', 'DESC')
      .where('user_id', userId);

    return helper.showClientSuccess(res, { billing, shipping });
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const create = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { userId } = req;
  try {
    const {
      firstName, lastName, address, city, postalCode, country, phoneNumber, province,
    } = req.body;
    if (!firstName) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!lastName) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!address) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!city) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!postalCode) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!country) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!phoneNumber) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    const id = uuidv1();
    const date = new Date();
    const checkShipping = await db('shippings').first('id').where('user_id', userId);

    if (checkShipping) {
      await db('shippings').update({
        first_name: firstName,
        last_name: lastName,
        address,
        city_id: city,
        zip: postalCode,
        country_id: country,
        phone: phoneNumber,
        state_code: province,
        created_at: date,
        updated_at: date,
      }).where('user_id', userId);
    } else {
      await db('shippings').insert({
        id,
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        address,
        city_id: city,
        zip: postalCode,
        country_id: country,
        phone: phoneNumber,
        state_code: province,
        created_at: date,
        updated_at: date,
      });
    }
    return helper.showClientSuccess(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName, lastName, address, city, postalCode, country, phoneNumber, province,
    } = req.body;
    if (!firstName) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!lastName) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!address) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!city) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!postalCode) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!country) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!phoneNumber) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    const checkid = await db('shippings').first('id').where({ id });
    if (!checkid) return helper.showClientBadRequest(res, 'shipping not exist');
    const date = new Date();

    await db('shippings').update({
      first_name: firstName,
      last_name: lastName,
      address,
      city_id: city,
      zip: postalCode,
      country_id: country,
      phone: phoneNumber,
      state_code: province,
      updated_at: date,
    }).where({ id });
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    await db('shipping_address').where({ id }).del();
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const listAll = async (req, res) => {
  try {
    const getAll = await db('shippings').select();
    return helper.showSuccessOk(res, getAll);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const detail = async (req, res) => {
  try {
    const { id } = req.params;
    const getOne = await db('shippings').where({ id }).first();
    return helper.showSuccessOk(res, getOne);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export const fakeStatus = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { id, status, isExchange } = req.body;
    let transactions = null;
    if (!isExchange) {
      transactions = await db('transactions')
        .select(
          'transactions.*',
          'rams.value as ram',
          'colors.name as color',
          'capacities.value as capacity',
          'devices.id as device_id',
          'models.name as model',
        )
        .innerJoin('devices', 'devices.id', 'transactions.device_id')
        .innerJoin('rams', 'devices.ram_id', 'rams.id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('imeis', 'devices.imei_id', 'imeis.id')
        .innerJoin('models', 'imeis.model_id', 'models.id')
        .whereIn('transactions.status', [TRANSACTION_STATUS.TO_BE_SHIPPED, TRANSACTION_STATUS.SHIPPED])
        .where('transactions.order_seller_id', id);
    } else {
      transactions = await db('transactions_exchange')
        .select(
          'transactions_exchange.*',
          'rams.value as ram',
          'colors.name as color',
          'capacities.value as capacity',
          'devices.id as device_id',
          'models.name as model',
        )
        .innerJoin('devices', 'devices.id', 'transactions_exchange.device_id')
        .innerJoin('rams', 'devices.ram_id', 'rams.id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('imeis', 'devices.imei_id', 'imeis.id')
        .innerJoin('models', 'imeis.model_id', 'models.id')
        .whereIn('transactions_exchange.status', [TRANSACTION_STATUS.TO_BE_SHIPPED, TRANSACTION_STATUS.SHIPPED])
        .where('transactions_exchange.order_seller_id', id);
    }

    if (transactions.length > 0) {
      const transactionIds = [];
      // eslint-disable-next-line array-callback-return
      transactions.map((trs) => {
        transactionIds.push(trs.id);
      });
      await db.transaction(async (trx) => {
        if (!isExchange) {
          await trx('transactions').update({
            status,
          }).whereIn('id', transactionIds);
        } else {
          await trx('transactions_exchange').update({
            status,
          }).whereIn('id', transactionIds);
        }
      });
    }

    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
export default {
  create, update, remove, listAll, detail, getShippingAndBillingLast,
};
