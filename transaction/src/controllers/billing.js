import helper from 'micro-helper';
import { v1 as uuidv1 } from 'uuid';
import db from '../adapters/db';

const create = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { userId } = req;
  try {
    const {
      firstName, lastName, address, city, postalCode, country, phoneNumber,
      province,
    } = req.body;
    if (!firstName) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!lastName) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!address) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!phoneNumber) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    const id = uuidv1();
    const date = new Date();
    const checkBilling = await db('billings').first('id').where('user_id', userId);

    if (checkBilling) {
      await db('billings').update({
        first_name: firstName,
        last_name: lastName,
        full_address: address,
        phone: phoneNumber,
        created_at: date,
        updated_at: date,
      }).where('user_id', userId);
    } else {
      await db('billings').insert({
        id,
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        full_address: address,
        phone: phoneNumber,
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
      firstName, lastName, address, city, postalCode, country, phoneNumber,
      province,
    } = req.body;
    if (!firstName) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!lastName) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!address) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!phoneNumber) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    const checkid = await db('billings').first('id').where({ id });
    if (!checkid) return helper.showClientBadRequest(res, 'billing not exist');
    const date = new Date();

    await db('billings').update({
      first_name: firstName,
      last_name: lastName,
      full_address: address,
      phone: phoneNumber,
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
    await db('billings').where({ id }).del();
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const listAll = async (req, res) => {
  try {
    const getAll = await db('billings').select();
    return helper.showSuccessOk(res, getAll);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const detail = async (req, res) => {
  try {
    const { id } = req.params;
    const getOne = await db('billings').where({ id }).first();
    return helper.showSuccessOk(res, getOne);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
export default {
  create, update, remove, listAll, detail,
};
