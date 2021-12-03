import helper from 'micro-helper';
import db from '../adapters/db';

const changeTempPassword = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await db('auth_users').first('password_temp').where('email', email);
    const passwordTemp = user.password_temp;
    await db('auth_users')
      .update({
        password: passwordTemp, active: true, active_code: null, password_temp: null,
      })
      .where('email', email);
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
export default changeTempPassword;
