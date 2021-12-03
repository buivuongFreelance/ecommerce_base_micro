import LangMicro from '../lang/LangMicro';
import { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_AUDIENCE } from '../config/auth0';
import ConfigAuth0Web from '../config/auth0Web';

class ServerMicro {
  static displaySuccess(res, msg) {
    return res.status(200).json(msg);
  }

  static displayClientError(res, msg) {
    let lmsg = msg;
    if (!msg) {
      lmsg = LangMicro.LANG_COMMON_CLIENT_ERROR;
    }
    return res.status(400).json(lmsg);
  }

  static displayServerAuth(res, msg) {
    let lmsg = msg;
    if (!msg) {
      lmsg = LangMicro.LANG_COMMON_AUTH_ERROR;
    }
    return res.status(401).json(lmsg);
  }

  static displayServerError(res, msg) {
    let lmsg = msg;
    if (!msg) {
      lmsg = LangMicro.LANG_COMMON_SERVER_ERROR;
    }
    return res.status(500).json(lmsg);
  }

  static validate = (req, res, next) => {
    if (!req.user) {
      return ServerMicro.displayServerAuth(res);
    }
    return next();
  };

  static checkJwt = (jwt, jwksRsa) => {
    return jwt({
      secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`
      }),
      audience: AUTH0_AUDIENCE,
      issuer: `https://${AUTH0_DOMAIN}/`,
      algorithms: ["RS256"]
    });
  };

  static checkJwtWeb = (jwt, jwksRsa) => {
    return jwt({
      secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${ConfigAuth0Web.AUTH0_DOMAIN}/.well-known/jwks.json`
      }),
      audience: ConfigAuth0Web.AUTH0_AUDIENCE,
      issuer: `https://${ConfigAuth0Web.AUTH0_DOMAIN}/`,
      algorithms: ["RS256"]
    });
  };

  static validateMiddleware = (req, db) => {
    return new Promise((resolve, reject) => {
      const { authorization } = req.headers;
      let flag = false;
      if (authorization) {
        const bearerArr = authorization.split(' ');
        const bearerStr = bearerArr[1];
        db('auth_access_tokens').first('id', 'auth_user_id').where('access_token', bearerStr)
          .then((accessToken) => {
            if (accessToken) {
              flag = true;
              req.userId = accessToken.auth_user_id;
              req.token = bearerStr;
            }
            resolve(flag);
          })
          .catch(error => {
            req.login = flag;
            reject(error);
          });
      }
    });
  }

  static validateNotAuthMiddleware = (req, db) => {
    return new Promise((resolve, reject) => {
      const { authorization } = req.headers;
      let flag = false;
      if (authorization) {
        const bearerArr = authorization.split(' ');
        const bearerStr = bearerArr[1];
        db('auth_access_tokens').first('id', 'auth_user_id').where('access_token', bearerStr)
          .then((accessToken) => {
            if (accessToken) {
              flag = true;
              req.userId = accessToken.auth_user_id;
              req.token = bearerStr;
            }
            resolve(flag);
          })
          .catch(error => {
            req.login = flag;
            reject(error);
          });
      } else {
        req.login = false;
        resolve(false);
      }
    });
  }
}

export default ServerMicro;
