import helper from 'micro-helper';
import db from '../adapters/db';

const registerTracingUser = async (req, res) => {
  try {
    const date = new Date();
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const tracingUser = await db('tracing_users').first('id').where('ip', ip);
    if (tracingUser) {
      return helper.showSuccessOk(res, tracingUser.id);
    }
    const id = await db('tracing_users').insert({ ip, created_at: date, updated_at: date }, 'id');
    return helper.showSuccessOk(res, id[0]);
  } catch (error) {
    console.log(error);
    return helper.showServerError(res, error);
  }
};
export default {
  registerTracingUser,
};
