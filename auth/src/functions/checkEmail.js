import helper from 'micro-helper';
import check from 'is_js';
import Joi from 'joi';
import db from '../adapters/db';

const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const schema = Joi.object({
      email: Joi.string().email({
        minDomainSegments: 2,
        tlds: { allow: ['com', 'net'] },
      }).min(6)
        .max(255)
        .pattern(new RegExp(/^[a-zA-Z0-9@.]+$/)),
    });
    const validation = schema.validate({ email });
    if (validation.error || validation.errors) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }
    const user = await db('auth_users').first('email').where('email', email);
    if (!check.existy(user)) {
      return helper.showSuccessOk(res, 'user exist');
    }
    return helper.showClientBadRequest(res, 'user not exist');
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
export default checkEmail;
