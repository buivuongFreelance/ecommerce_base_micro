import check from 'is_js';
import db from './adapters/db';

const validate = async (req, res, next) => {
  const { authorization } = req.headers;
  let flag = false;
  if (check.string(authorization)) {
    const bearerArr = authorization.split(' ');
    const bearerStr = bearerArr[1];
    const accessToken = await db('auth_access_tokens').select('id', 'auth_user_id').where('access_token', bearerStr).first();
    if (accessToken) {
      flag = true;
      req.userId = accessToken.auth_user_id;
      req.token = bearerStr;
    }
  }
  req.login = flag;
  return next();
};

export default {
  validate,
};
