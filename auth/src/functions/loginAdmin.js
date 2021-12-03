import check from 'is_js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import helper from 'micro-helper';
import Joi from 'joi';
import db from '../adapters/db';

require('dotenv').config();

const { NODE_ENV, CLIENT_SECRET } = process.env;

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const schema = Joi.object({
      email: Joi.string()
        .email({
          minDomainSegments: 2,
          tlds: { allow: ['com', 'net'] },
        })
        .required()
        .min(6)
        .max(255)
        .pattern(new RegExp(/^[a-zA-Z0-9@.]+$/)),
      password: Joi.string()
        .required()
        .min(6)
        .max(255),
    });
    const validation = schema.validate({ email, password });
    if (validation.error || validation.errors) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }
    if (!email) return helper.showClientEmpty(res);
    if (!password) return helper.showClientEmpty(res);
    if (!check.email(email)) return helper.showClientEmpty(res);

    const user = await db
      .first('id', 'email', 'password', 'active')
      .table('auth_users')
      .where('email', email);
    if (!check.existy(user)) return helper.showClientBadRequest(res, 'USER_INVALID');
    const pwd = await bcrypt.compare(password, user.password);
    if (!pwd) return helper.showClientBadRequest(res, 'USER_INVALID');
    if (!user.active) return helper.showClientBadRequest(res, 'USER_NOT_ACTIVE');
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

    const date = new Date();

    const objInsertAccessToken = {
      access_token: accessToken,
      auth_client_id: 2,
      auth_user_id: user.id,
      ip_address: ip,
      user_agent: userAgent,
      created_at: date,
      updated_at: date,
    };

    const objInsertRefreshAccessToken = {
      refresh_token: refreshToken,
      auth_client_id: 2,
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
  } catch (error) {
    if (NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`error ${error}`);
    }
    return helper.showServerError(res, error);
  }
};

module.exports = loginAdmin;
