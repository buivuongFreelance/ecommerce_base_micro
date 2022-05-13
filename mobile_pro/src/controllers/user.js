import { v1 as uuidv1 } from 'uuid';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import EmailTemplate from 'email-templates';
import generatePassword from 'generate-password';
import path from 'path';
import helper from 'micro-helper';
import db from '../adapters/db';
import config from '../config';
import nodemailer from '../adapters/email';
import { queryTransactionAvailable, queryTransactionExchangeAvailable } from '../services';

const { CLIENT_SECRET } = process.env;

const loginQrCode = async (req, res) => {
  try {
    const { email } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

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
    const user = await db('auth_users')
      .first('id', 'email', 'wallet')
      .where('email', email);
    const date = new Date();
    if (!user) {
      return helper.showServerError(res, true);
    }
    const objInsertAccessToken = {
      access_token: accessToken,
      auth_client_id: 4,
      auth_user_id: user.id,
      ip_address: ip,
      user_agent: userAgent,
      created_at: date,
      updated_at: date,
    };
    const objInsertRefreshAccessToken = {
      refresh_token: refreshToken,
      auth_client_id: 4,
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
    return helper.showClientSuccess(res, {
      email, token: accessToken, id: user.id, wallet: user.wallet,
    });
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const register = async (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(422).json({ message: 'email must provided' });
  }
  if (!password) {
    return res.status(422).json({ message: 'password must provided' });
  }
  const { ERR_USAGE, ERR_EXISTS } = config;

  try {
    const user = await db('auth_users')
      .select('id')
      .where('email', email)
      .first();
    if (user) {
      return res.status(500).json({ done: ERR_EXISTS });
    }
    const idv1 = uuidv1();
    const pass = bcrypt.hashSync(password, 10);
    const date = new Date();

    await db('auth_users').insert({
      id: idv1,
      email,
      password: pass,
      active: true,
      auth_client_id: 4,
      auth_social_id: 1,
      wallet: 0,
      created_at: date,
      updated_at: date,
    });

    return res.json({ done: true });
  } catch (error) {
    return res.status(500).json({ done: ERR_USAGE });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(422).json({ message: 'email must provided' });
  }
  if (!password) {
    return res.status(422).json({ message: 'password must provided' });
  }
  const { ERR_USAGE, ERR_NOT_EXISTS, ERR_COMMON } = config;

  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];

  try {
    const user = await db('auth_users')
      .select('id', 'email', 'password', 'wallet')
      .where('email', email)
      .first();
    if (!user) {
      return res.status(400).json({ done: ERR_NOT_EXISTS });
    }
    const userPassword = user.password;
    const userId = user.id;
    const { wallet } = user;
    const token = jwt.sign({ id: userId, email }, email);
    const isSame = bcrypt.compareSync(password, userPassword);

    if (!isSame) {
      return res.status(400).json({ done: ERR_COMMON });
    }

    const date = new Date();
    await db('auth_access_tokens').insert({
      access_token: token,
      auth_client_id: 4,
      auth_user_id: userId,
      ip_address: ip,
      user_agent: userAgent,
      created_at: date,
      updated_at: date,
    });

    return res.json({
      done: true,
      user: {
        token,
        id: userId,
        email,
        wallet,
      },
    });
  } catch (error) {
    return res.status(500).json({ done: ERR_USAGE });
  }
};

const loginWithTransaction = async (req, res) => {
  const { email, password, transactionCode } = req.body;
  if (!email) {
    return res.status(422).json({ message: helper.ERR_COMMON });
  }
  if (!password) {
    return res.status(422).json({ message: helper.ERR_COMMON });
  }
  if (!transactionCode) {
    return res.status(422).json({ message: helper.ERR_COMMON });
  }
  const { ERR_USAGE, ERR_NOT_EXISTS, ERR_COMMON } = config;

  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];

  try {
    const user = await db('auth_users')
      .select('id', 'email', 'password', 'wallet')
      .where('email', email)
      .first();
    if (!user) {
      return res.status(400).json({ done: ERR_NOT_EXISTS });
    }

    const transaction = await queryTransactionAvailable(user, transactionCode);
    const transactionExchange = await queryTransactionExchangeAvailable(user, transactionCode);

    if (!transaction && !transactionExchange) {
      return res.json({
        done: true,
        message: config.IS_LOCKED,
      });
    }

    const userPassword = user.password;
    const userId = user.id;
    const { wallet } = user;
    const token = jwt.sign({ id: userId, email }, email);
    const isSame = bcrypt.compareSync(password, userPassword);

    if (!isSame) {
      return res.status(400).json({ done: ERR_COMMON });
    }

    const date = new Date();
    await db('auth_access_tokens').insert({
      access_token: token,
      auth_client_id: 4,
      auth_user_id: userId,
      ip_address: ip,
      user_agent: userAgent,
      created_at: date,
      updated_at: date,
    });

    return res.json({
      done: true,
      user: {
        token,
        id: userId,
        email,
        wallet,
      },
    });
  } catch (error) {
    return res.status(500).json({ done: ERR_USAGE });
  }
};

const loginWithFacebook = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(422).json({ message: 'email must provided' });
  }

  const { ERR_USAGE } = config;

  const trx = await db.transaction();
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const date = new Date();

  try {
    const user = await db('auth_users')
      .select('id', 'email', 'password', 'wallet')
      .where('email', email)
      .first();
    if (!user) {
      const userId = uuidv1();
      const password = bcrypt.hashSync(userId, 10);
      const token = jwt.sign({ id: userId, email }, email);

      await trx('auth_users').insert({
        id: userId,
        email,
        password,
        active: true,
        auth_client_id: 4,
        auth_social_id: 2,
        wallet: 0,
        created_at: date,
        updated_at: date,
      });

      await trx('auth_access_tokens').insert({
        access_token: token,
        auth_client_id: 4,
        auth_user_id: userId,
        ip_address: ip,
        user_agent: userAgent,
        created_at: date,
        updated_at: date,
      });
      await trx.commit();
      return res.json({
        done: true,
        user: {
          token,
          id: userId,
          email,
          wallet: 0,
        },
      });
    }
    const { wallet, id } = user;
    const token = jwt.sign({ id, email }, email);
    await trx('auth_access_tokens').insert({
      access_token: token,
      auth_client_id: 4,
      auth_user_id: id,
      ip_address: ip,
      user_agent: userAgent,
      created_at: date,
      updated_at: date,
    });
    await trx.commit();
    return res.json({
      done: true,
      user: {
        token,
        id,
        email,
        wallet,
      },
    });
  } catch (error) {
    await trx.rollback();
    return res.status(500).json({ done: ERR_USAGE });
  }
};

const loginWithFacebookTransaction = async (req, res) => {
  const { email, transactionCode } = req.body;
  if (!email || !transactionCode) {
    return res.status(422).json({ message: 'email must provided' });
  }

  const { ERR_USAGE, ERR_NOT_EXISTS } = config;

  const trx = await db.transaction();
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const date = new Date();

  try {
    const user = await db('auth_users')
      .select('id', 'email', 'password', 'wallet')
      .where('email', email)
      .first();
    if (!user) {
      return res.status(400).json({ done: ERR_NOT_EXISTS });
    }

    const transaction = await queryTransactionAvailable(user, transactionCode);
    const transactionExchange = await queryTransactionExchangeAvailable(user, transactionCode);

    if (!transaction && !transactionExchange) {
      return res.json({
        done: true,
        message: config.IS_LOCKED,
      });
    }
    if (!user) {
      const userId = uuidv1();
      const password = bcrypt.hashSync(userId, 10);
      const token = jwt.sign({ id: userId, email }, email);

      await trx('auth_users').insert({
        id: userId,
        email,
        password,
        active: true,
        auth_client_id: 4,
        auth_social_id: 2,
        wallet: 0,
        created_at: date,
        updated_at: date,
      });

      await trx('auth_access_tokens').insert({
        access_token: token,
        auth_client_id: 4,
        auth_user_id: userId,
        ip_address: ip,
        user_agent: userAgent,
        created_at: date,
        updated_at: date,
      });
      await trx.commit();
      return res.json({
        done: true,
        user: {
          token,
          id: userId,
          email,
          wallet: 0,
        },
      });
    }
    const { wallet, id } = user;
    const token = jwt.sign({ id, email }, email);
    await trx('auth_access_tokens').insert({
      access_token: token,
      auth_client_id: 4,
      auth_user_id: id,
      ip_address: ip,
      user_agent: userAgent,
      created_at: date,
      updated_at: date,
    });
    await trx.commit();
    return res.json({
      done: true,
      user: {
        token,
        id,
        email,
        wallet,
      },
    });
  } catch (error) {
    await trx.rollback();
    return res.status(500).json({ done: ERR_USAGE });
  }
};

const loginWithGoogle = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(422).json({ message: 'email must provided' });
  }

  const { ERR_USAGE } = config;

  const trx = await db.transaction();
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const date = new Date();

  try {
    const user = await db('auth_users')
      .select('id', 'email', 'password', 'wallet')
      .where('email', email)
      .first();
    if (!user) {
      const userId = uuidv1();
      const password = bcrypt.hashSync(userId, 10);
      const token = jwt.sign({ id: userId, email }, email);

      await trx('auth_users').insert({
        id: userId,
        email,
        password,
        active: true,
        auth_client_id: 4,
        auth_social_id: 3,
        wallet: 0,
        created_at: date,
        updated_at: date,
      });

      await trx('auth_access_tokens').insert({
        access_token: token,
        auth_client_id: 4,
        auth_user_id: userId,
        ip_address: ip,
        user_agent: userAgent,
        created_at: date,
        updated_at: date,
      });
      await trx.commit();
      return res.json({
        done: true,
        user: {
          token,
          id: userId,
          email,
          wallet: 0,
        },
      });
    }
    const { wallet, id } = user;
    const token = jwt.sign({ id, email }, email);
    await trx('auth_access_tokens').insert({
      access_token: token,
      auth_client_id: 4,
      auth_user_id: id,
      ip_address: ip,
      user_agent: userAgent,
      created_at: date,
      updated_at: date,
    });
    await trx.commit();
    return res.json({
      done: true,
      user: {
        token,
        id,
        email,
        wallet,
      },
    });
  } catch (error) {
    await trx.rollback();
    return res.status(500).json({ done: ERR_USAGE });
  }
};

const loginWithGoogleTransaction = async (req, res) => {
  const { email, transactionCode } = req.body;
  if (!email || !transactionCode) {
    return res.status(422).json({ message: 'email must provided' });
  }

  const { ERR_USAGE, ERR_NOT_EXISTS } = config;
  const trx = await db.transaction();
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const date = new Date();

  try {
    const user = await db('auth_users')
      .select('id', 'email', 'password', 'wallet')
      .where('email', email)
      .first();
    if (!user) {
      return res.status(400).json({ done: ERR_NOT_EXISTS });
    }

    const transaction = await queryTransactionAvailable(user, transactionCode);
    const transactionExchange = await queryTransactionExchangeAvailable(user, transactionCode);

    if (!transaction && !transactionExchange) {
      return res.json({
        done: true,
        message: config.IS_LOCKED,
      });
    }
    if (!user) {
      const userId = uuidv1();
      const password = bcrypt.hashSync(userId, 10);
      const token = jwt.sign({ id: userId, email }, email);

      await trx('auth_users').insert({
        id: userId,
        email,
        password,
        active: true,
        auth_client_id: 4,
        auth_social_id: 3,
        wallet: 0,
        created_at: date,
        updated_at: date,
      });

      await trx('auth_access_tokens').insert({
        access_token: token,
        auth_client_id: 4,
        auth_user_id: userId,
        ip_address: ip,
        user_agent: userAgent,
        created_at: date,
        updated_at: date,
      });
      await trx.commit();
      return res.json({
        done: true,
        user: {
          token,
          id: userId,
          email,
          wallet: 0,
        },
      });
    }
    const { wallet, id } = user;
    const token = jwt.sign({ id, email }, email);
    await trx('auth_access_tokens').insert({
      access_token: token,
      auth_client_id: 4,
      auth_user_id: id,
      ip_address: ip,
      user_agent: userAgent,
      created_at: date,
      updated_at: date,
    });
    await trx.commit();
    return res.json({
      done: true,
      user: {
        token,
        id,
        email,
        wallet,
      },
    });
  } catch (error) {
    await trx.rollback();
    return res.status(500).json({ done: ERR_USAGE });
  }
};

const loginWithApple = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(422).json({ message: 'id must provided' });
  }

  const { ERR_USAGE } = config;

  const trx = await db.transaction();
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const date = new Date();

  try {
    const user = await db('auth_users')
      .select('id', 'email', 'password', 'wallet')
      .where('email', email)
      .first();
    if (!user) {
      const userId = uuidv1();
      const password = bcrypt.hashSync(userId, 10);
      const token = jwt.sign({ id: userId, email }, email);

      await trx('auth_users').insert({
        id: userId,
        email,
        password,
        active: true,
        auth_client_id: 4,
        auth_social_id: 4,
        wallet: 0,
        created_at: date,
        updated_at: date,
      });

      await trx('auth_access_tokens').insert({
        access_token: token,
        auth_client_id: 4,
        auth_user_id: userId,
        ip_address: ip,
        user_agent: userAgent,
        created_at: date,
        updated_at: date,
      });
      await trx.commit();
      return res.json({
        done: true,
        user: {
          token,
          id: userId,
          email,
          wallet: 0,
        },
      });
    }
    const { wallet, id } = user;
    const token = jwt.sign({ id, email }, email);
    await trx('auth_access_tokens').insert({
      access_token: token,
      auth_client_id: 4,
      auth_user_id: id,
      ip_address: ip,
      user_agent: userAgent,
      created_at: date,
      updated_at: date,
    });
    await trx.commit();
    return res.json({
      done: true,
      user: {
        token,
        id,
        email,
        wallet,
      },
    });
  } catch (error) {
    await trx.rollback();
    return res.status(500).json({ done: ERR_USAGE });
  }
};

const logout = async (req, res) => {
  if (!req.login) {
    return res.json({ done: true });
  }

  const { token } = req;

  try {
    await db('auth_access_tokens').where('access_token', token).del();
    return res.json({ done: true });
  } catch (error) {
    return res.json({ done: true });
  }
};

const walletDetail = async (req, res) => {
  const { ERR_USAGE, ERR_BAD_REQUEST } = config;
  if (!req.login) {
    return res.status(400).json({ done: ERR_BAD_REQUEST });
  }
  try {
    const { userId } = req;
    const user = await db('auth_users')
      .select('wallet')
      .where('id', userId)
      .first();
    if (!user) {
      return res.status(400).json({ done: ERR_BAD_REQUEST });
    }
    const { wallet } = user;
    return res.json({ done: true, wallet });
  } catch (error) {
    return res.status(500).json({ done: ERR_USAGE });
  }
};

const walletPlus = async (req, res) => {
  const { ERR_USAGE, ERR_BAD_REQUEST } = config;
  const { money } = req.body;
  if (!money) {
    return res.status(422).json({ message: 'money must provided' });
  }
  if (!req.login) {
    return res.status(400).json({ done: ERR_BAD_REQUEST });
  }
  try {
    const { userId } = req;
    const user = await db('auth_users')
      .select('wallet')
      .where('id', userId)
      .first();
    if (!user) {
      return res.status(400).json({ done: ERR_BAD_REQUEST });
    }
    const { wallet } = user;
    let newWallet = wallet || 0;
    newWallet = parseFloat(newWallet) + parseFloat(money);
    await db('auth_users')
      .update({
        wallet: newWallet,
      })
      .where('id', userId);
    return res.json({ done: true, wallet: newWallet });
  } catch (error) {
    return res.status(500).json({ done: ERR_USAGE });
  }
};

const walletMinus = async (req, res) => {
  const { ERR_USAGE, ERR_BAD_REQUEST } = config;
  const { money } = req.body;
  if (!money) {
    return res.status(422).json({ message: 'money must provided' });
  }
  if (!req.login) {
    return res.status(400).json({ done: ERR_BAD_REQUEST });
  }
  try {
    const { userId } = req;
    const user = await db('auth_users')
      .select('wallet')
      .where('id', userId)
      .first();
    if (!user) {
      return res.status(400).json({ done: ERR_BAD_REQUEST });
    }
    const { wallet } = user;
    let newWallet = wallet || 0;
    newWallet = parseFloat(newWallet) - parseFloat(money);
    await db('auth_users')
      .update({
        wallet: newWallet,
      })
      .where('id', userId);
    return res.json({ done: true, wallet: newWallet });
  } catch (error) {
    return res.status(500).json({ done: ERR_USAGE });
  }
};

const settings = async (req, res) => {
  const { ERR_USAGE, ERR_BAD_REQUEST } = config;
  if (!req.login) {
    return res.status(400).json({ done: ERR_BAD_REQUEST });
  }
  try {
    const list = await db('settings').select('*');

    return res.json({ done: true, list });
  } catch (error) {
    return res.status(500).json({ done: ERR_USAGE });
  }
};

const rules = async (req, res) => {
  const { ERR_USAGE } = config;
  try {
    const list = {
      total: 50,
      touchscreen: 30,
      bluetooth: 5,
      wifi: 5,
      finger: 2,
      camera: 15,
      flash: 15,
      storage: 5,
      processor: 5,
      released: 5,
      faceID: 2,
    };
    return res.json({ done: true, list });
  } catch (error) {
    return res.status(500).json(ERR_USAGE);
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  const { ERR_NOT_EXISTS } = config;

  if (!email) {
    return res.status(422).json({ message: 'email must provided' });
  }

  const user = await db('auth_users').select('id');
  if (!user) return res.status().json({ done: ERR_NOT_EXISTS });

  const emailTemplateClass = new EmailTemplate();
  const pass = await generatePassword.generate({
    length: 6,
    numbers: true,
  });
  const password = await bcrypt.hashSync(pass, 10);
  const date = new Date();
  const locals = {
    email,
    password: pass,
  };

  const html = await emailTemplateClass.render(
    path.resolve(__dirname, '..', '..', 'templates/forgotPassword'),
    locals,
  );

  const mailOptions = {
    from: 'dingtoi@gmail.com',
    to: email,
    subject: 'Dingtoi Forgot Password',
    html,
  };

  await nodemailer.sendMail(mailOptions);

  await db('auth_users').update({
    password,
    updated_at: date,
  }).where('email', email);

  return res.json({ done: true });
};

module.exports = {
  loginWithTransaction,
  loginWithGoogleTransaction,
  loginWithGoogle,
  loginQrCode,
  logout,
  walletDetail,
  walletPlus,
  walletMinus,
  rules,
  settings,
  login,
  register,
  loginWithFacebook,
  loginWithFacebookTransaction,
  forgotPassword,
  loginWithApple,
};
