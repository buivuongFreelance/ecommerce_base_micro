import check from 'is_js';
import helper from 'micro-helper';
import db from './adapters/db';

const validate = async (req, res, next) => {
  const { authorization } = req.headers;
  let flag = false;
  try {
    if (check.string(authorization)) {
      const bearerArr = authorization.split(' ');
      const bearerStr = bearerArr[1];
      const accessToken = await db('auth_access_tokens').first('id', 'auth_user_id').where('access_token', bearerStr);
      if (accessToken) {
        flag = true;
        req.userId = accessToken.auth_user_id;
        req.token = bearerStr;
      } else {
        return helper.showClientUnauthorized(res, true);
      }
    }
    req.login = flag;
  } catch (error) {
    req.login = flag;
  }
  return next();
};

export default {
  validate,
};
