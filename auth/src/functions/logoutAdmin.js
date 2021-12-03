import helper from 'micro-helper';
import db from '../adapters/db';

require('dotenv').config();

const { NODE_ENV } = process.env;

const logoutAdmin = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { userId } = req;
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  try {
    await db.transaction(async (trx) => {
      await trx('auth_access_tokens').where({
        auth_client_id: 2,
        auth_user_id: userId,
        ip_address: ip,
      }).del();
      await trx('auth_refresh_tokens').where({
        auth_client_id: 2,
        auth_user_id: userId,
        ip_address: ip,
      }).del();
    });

    return helper.showClientSuccess(res, 'SUCCESS');
  } catch (error) {
    if (NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`error ${error}`);
    }
    return helper.showServerError(res, error);
  }
};

export default logoutAdmin;
