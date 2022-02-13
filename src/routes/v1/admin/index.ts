import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { config } from '../../..';
import { FastifyRequestWithUser } from '..';
import { APIError, sendError } from '../../../common/error';
import { getTokenFromRequest } from '../../../common/token';
import * as Meiling from '../../../common/meiling';
import * as User from '../../../common/user';

const adminHandler = (app: FastifyInstance, opts: FastifyPluginOptions, done: () => void): void => {
  app.addHook('onRequest', async (req, rep) => {
    const token = getTokenFromRequest(req);
    if (!token) {
      sendError(rep, APIError.TOKEN_NOT_FOUND, 'token not found');
      throw new Error();
    }

    if (config.admin.token.includes(token.token)) {
      (req as FastifyRequestWithUser).isAdmin = true;
    } else {
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
    }

    if (!(req as FastifyRequestWithUser).isAdmin) {
      sendError(rep, APIError.INVALID_TOKEN, 'invalid token');
      throw new Error();
    }
  });

  app.get('/', (req, rep) => {
    rep.send({
      version: 1,
      admin: true,
    });
  });

  done();
};

export default adminHandler;
