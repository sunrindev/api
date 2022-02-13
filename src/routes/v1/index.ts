import { FastifyRequest, FastifyInstance, FastifyPluginOptions } from 'fastify';
import { config } from '../../';
import { sendError, APIError } from '../../common/error';
import { MeilingV1OAuthOpenIDData } from '../../common/meiling/interface';
import { getTokenFromRequest } from '../../common/token';
import * as Meiling from '../../common/meiling';
import * as User from '../../common/user';
import adminHandler from './admin';

export interface FastifyRequestWithUser extends FastifyRequest {
  user: MeilingV1OAuthOpenIDData;
  isAdmin: boolean;
}

const v1Handler = (app: FastifyInstance, opts: FastifyPluginOptions, done: () => void): void => {
  app.get('/', (req, rep) => {
    rep.send({
      version: 1,
    });
  });

  app.register(v1LoginRequiredHandler);
  app.register(adminHandler, { prefix: '/admin' });

  done();
};

const v1LoginRequiredHandler = (app: FastifyInstance, opts: FastifyPluginOptions, done: () => void) => {
  app.addHook('onRequest', async (req, rep) => {
    const token = getTokenFromRequest(req);
    if (!token) {
      sendError(rep, APIError.TOKEN_NOT_FOUND, 'token not found');
      throw new Error();
    }

    const data = await Meiling.getToken(token.token);
    if (!data) {
      sendError(rep, APIError.INVALID_TOKEN, 'token is invalid');
      throw new Error();
    }

    const permCheck = await Meiling.permCheck(token.token, config.permissions.required);
    if (!permCheck) {
      sendError(rep, APIError.INSUFFICIENT_PERMISSION, 'token does not meet with minimum sufficient permission');
      throw new Error();
    }

    const user = await Meiling.getUser(token.token);
    if (!user) {
      sendError(rep, APIError.USER_NOT_FOUND, 'unable to load user inforamtion');
      throw new Error();
    }

    (req as FastifyRequestWithUser).user = user;
    (req as FastifyRequestWithUser).isAdmin = await User.checkIsAdmin(user);

    await User.createUserIfNotExist(user);
    await User.updateLastAuthorized(user);
  });

  done();
};

export default v1Handler;
