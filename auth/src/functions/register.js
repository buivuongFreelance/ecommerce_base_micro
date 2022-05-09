/* eslint-disable object-curly-newline */
import bcrypt from 'bcrypt';
import { v4 as uuidv4, v1 as uuidv1 } from 'uuid';
import JOI from 'joi';
import helper from 'micro-helper';
import db from '../adapters/db';
import sendEmail from './sendEmail';

const { URL_ACTIVE, NODE_ENV, DOMAIN_DRIVEN_EMAIL } = process.env;

const registration = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) return helper.showClientEmpty(res);
    if (!password) return helper.showClientEmpty(res);

    const schema = JOI.object({
      email: JOI.string()
        .required()
        .email({
          minDomainSegments: 2,
          tlds: { allow: ['com', 'net'] },
        })
        .min(8)
        .max(255)
        .pattern(new RegExp(/^[a-zA-Z0-9@.]+$/)),
      password: JOI.string()
        .required()
        .min(8)
        .max(100)
        // eslint-disable-next-line no-useless-escape
        .pattern(new RegExp(/^(?=.*[a-z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})/)),
    });

    const validation = schema.validate({ email, password });
    if (validation.error || validation.errors) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }
    const account = await db
      .first('email')
      .table('auth_users')
      .where('email', email);
    if (account) return helper.showClientEmailOrPasswordExist(res);
    const activeCode = uuidv4();
    const id = uuidv1();
    // eslint-disable-next-line camelcase
    const passwordReset = uuidv1();
    const hashPassword = await bcrypt.hash(password, 10);
    const date = new Date();
    await db('auth_users').insert({
      id,
      email,
      password: hashPassword,
      password_reset_token: passwordReset,
      active: false,
      active_code: activeCode,
      auth_client_id: 1,
      auth_social_id: 1,
      wallet: 0,
      created_at: date,
      updated_at: date,
    });
    const api = `${URL_ACTIVE}/verify/${activeCode}`;
    // const api = `http://192.168.1.9/api/v1/auth/verify/${activeCode}`;
    const url = `${DOMAIN_DRIVEN_EMAIL}/registration`;
    // const url = `http://192.168.1.9:4000/api/v1/email/registration`;
    sendEmail.sendEmailRegistration(email, api, url);
    return helper.showClientSuccess(res, 'Check email for authentication');
  } catch (error) {
    if (NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`error ${error}`);
    }
    return helper.showServerError(res, error);
  }
};

export default registration;
