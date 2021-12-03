import check from 'is_js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import helper from 'micro-helper';
import generator from 'generate-password';
import { v1 as uuidv1 } from 'uuid';
import db from '../adapters/db';

require('dotenv').config();

const { NODE_ENV, CLIENT_SECRET } = process.env;

const loginGmail = async (req, res) => {
  try {
    const { email } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const accessToken = jwt.sign(
      {
        data: email,
      },
      CLIENT_SECRET,
      // eslint-disable-next-line comma-dangle
      { expiresIn: '2y' }
    );
    const refreshToken = jwt.sign(
      {
        data: email,
      },
      CLIENT_SECRET,
      // eslint-disable-next-line comma-dangle
      { expiresIn: '4y' }
    );
    const user = await db
      .first('id', 'email')
      .table('auth_users')
      .where('email', email);
    const date = new Date();
    if (check.existy(user)) {
      const objInsertAccessToken = {
        access_token: accessToken,
        auth_client_id: 1,
        auth_user_id: user.id,
        ip_address: ip,
        user_agent: userAgent,
        created_at: date,
        updated_at: date,
      };
      const objInsertRefreshAccessToken = {
        refresh_token: refreshToken,
        auth_client_id: 1,
        auth_user_id: user.id,
        ip_address: ip,
        user_agent: userAgent,
        created_at: date,
        updated_at: date,
      };
      await db.transaction(async (trx) => {
        await trx('auth_access_tokens').insert(objInsertAccessToken);
        await trx('auth_refresh_tokens').insert(objInsertRefreshAccessToken);
      });
      return helper.showClientSuccess(res, { email, accessToken });
    }
    const password = generator.generate({
      length: 10,
      numbers: true,
    });
    const passwordReset = uuidv1();
    const hashPassword = await bcrypt.hash(password, 10);
    const id = uuidv1();
    const objInsertNewUser = {
      id,
      email,
      password: hashPassword,
      password_reset_token: passwordReset,
      active: true,
      active_code: null,
      auth_client_id: 1,
      auth_social_id: 3,
      wallet: 0,
      created_at: date,
      updated_at: date,
    };
    const objInsertNewUserAccessToken = {
      access_token: accessToken,
      auth_client_id: 1,
      auth_user_id: id,
      ip_address: ip,
      user_agent: userAgent,
      created_at: date,
      updated_at: date,
    };

    const objInsertNewUserRefreshAccessToken = {
      refresh_token: refreshToken,
      auth_client_id: 1,
      auth_user_id: id,
      ip_address: ip,
      user_agent: userAgent,
      created_at: date,
      updated_at: date,
    };
    await db.transaction(async (trx) => {
      await trx('auth_users').insert(objInsertNewUser);
      await trx('auth_access_tokens').insert(objInsertNewUserAccessToken);
      await trx('auth_refresh_tokens').insert(objInsertNewUserRefreshAccessToken);
    });
    return helper.showClientSuccess(res, { email, accessToken });
  } catch (error) {
    if (NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`error ${error}`);
    }
    return helper.showServerError(res, error);
  }
};

module.exports = loginGmail;
