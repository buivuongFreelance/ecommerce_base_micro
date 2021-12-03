import helper from 'micro-helper';
import bcrypt from 'bcrypt';
import db from '../adapters/db';

export const getWallet = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { userId } = req;
  try {
    const user = await db('auth_users').first('wallet').where('id', userId);
    return helper.showSuccessOk(res, user);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const createAndUpdate = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { userId } = req;
  try {
    const {
      firstName, lastName, idNumber,
      dob, gender, countryId, postalCode, address, province,
    } = req.body;
    const date = new Date();
    const checkUserInfo = await db('auth_users_info').where({ user_id: userId }).first();
    if (!checkUserInfo) {
      await db('auth_users_info').insert({
        user_id: userId,
        first_name: firstName || null,
        last_name: lastName || null,
        id_number: idNumber || null,
        DOB: dob || null,
        gender: gender || null,
        country_id: countryId || null,
        postal_code: postalCode || null,
        address: address || null,
        province: province || null,
        created_at: date,
        updated_at: date,
      });
    }
    await db('auth_users_info').update({
      first_name: firstName || null,
      last_name: lastName || null,
      id_number: idNumber || null,
      DOB: dob || null,
      gender: gender || null,
      country_id: countryId || null,
      postal_code: postalCode || null,
      address: address || null,
      province: province || null,
      created_at: date,
      updated_at: date,
    }).where({ user_id: userId });
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const detail = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { userId } = req;
  try {
    const user = await db('auth_users_info')
      .join('auth_users', 'auth_users.id', 'auth_users_info.user_id')
      .leftJoin('countries', 'countries.id', 'auth_users_info.country_id')
      .where('auth_users_info.user_id', userId)
      .first('auth_users_info.first_name',
        'auth_users_info.last_name',
        'auth_users_info.id_number',
        'auth_users_info.DOB',
        'auth_users_info.gender',
        'auth_users_info.postal_code',
        'auth_users_info.address',
        'auth_users.phone',
        'auth_users_info.province',
        'countries.name as country_name');
    return helper.showSuccessOk(res, user || null);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const remove = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { userId } = req;
  try {
    await db('auth_users_info').where({ user_id: userId }).update({
      first_name: null,
      last_name: null,
      id_number: null,
      DOB: null,
      gender: null,
      country_id: null,
      postal_code: null,
      address: null,
      province_id: null,
    });
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const changePassword = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { userId } = req;
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!newPassword) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    const PassWordCurrent = await db('auth_users').where({ id: userId }).first('password');
    const checkPassword = await bcrypt.compare(currentPassword, PassWordCurrent.password);
    if (!checkPassword) {
      return helper.showClientBadRequest(res, 'PASSWORD_NOT_CORRECT');
    }
    const hashPassword = await bcrypt.hash(newPassword, 10);
    await db('auth_users').where({ id: userId }).update({ password: hashPassword });
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
export default {
  createAndUpdate, detail, remove, changePassword,
};
