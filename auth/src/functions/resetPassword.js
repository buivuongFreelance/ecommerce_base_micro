import helper from 'micro-helper';
import bcrypt from 'bcrypt';
import db from '../adapters/db';

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await db('auth_users').first('id').where('password_reset_token', token);
    if(!user)
        return helper.showServerError(res, '');
    const hashPassword = await bcrypt.hash(password, 10);
    await db('auth_users')
      .update({
        password: hashPassword, active: true, active_code: null, password_temp: null,
        password_reset_token: null,
      })
      .where('id', user.id);
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
      console.log('error', error);
    return helper.showServerError(res, error);
  }
};
export default resetPassword;
