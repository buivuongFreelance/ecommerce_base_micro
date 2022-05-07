import helper from 'micro-helper';
import check from 'is_js';
import generator from 'generate-password';
import Joi from 'joi';
import db from '../adapters/db';
import sendEmail from './sendEmail';
import { v1 as uuidv1 } from 'uuid';

const { DOMAIN_DRIVEN_EMAIL, URL_RESET_PASS } = process.env;
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const schema = Joi.object({
      email: Joi.string()
        .required()
        .email({
          minDomainSegments: 2,
          tlds: { allow: ['com', 'net'] },
        })
        .min(6)
        .max(255)
        .pattern(new RegExp(/^[a-zA-Z0-9@.]+$/)),
    });
    const validation = schema.validate({ email });
    if (validation.error || validation.errors) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }
    const checkEmail = await db('auth_users')
      .first('email')
      .where('email', email);
    if (!check.existy(checkEmail)) return helper.showClientBadRequest(res, 'email not exist');
    const ramdomPassword = generator.generate({
      length: 8,
      numbers: true,
      symbols: true,
      lowercase: true,
    });

    const token = uuidv1();

    // const api = `${URL_RESET_PASS}?token=${token}`;
    const api = `http://localhost:3000/reset-password?token=${token}`;
    // const url = `${DOMAIN_DRIVEN_EMAIL}/forgotPassword`;
    const url = `http://192.168.1.9:4000/api/v1/email/forgotPassword`;

    sendEmail.sendEmailForgotPassword(email, ramdomPassword, url, api);
    await db('auth_users').update({ password_reset_token: token }).where('email', email);

    return helper.showSuccessOk(res, 'send email new password');
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
export default forgotPassword;
