import helper from 'micro-helper';
import db from '../adapters/db';

const { URL_LOGIN_PAGE } = process.env;

const verify = async (req, res) => {
  try {
    const { activeCode } = req.params;
    await db('auth_users')
      .update({ active: true, active_code: null })
      .where('active_code', activeCode);

    res.writeHead(301,
      { location: 'http://localhost:3000/sign-in' }
    );
    res.end();

  } catch (error) {
    console.log(error);
    return helper.showServerError(res, error);
  }
};
export default verify;
