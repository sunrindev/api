import { FastifyReply } from 'fastify';

export enum APIError {
  TOKEN_NOT_FOUND = 'token_not_found',
  INVALID_TOKEN = 'invalid_token',
  INSUFFICIENT_PERMISSION = 'insufficient_permission',
  USER_NOT_FOUND = 'user_not_found',
  HAVE_A_NICE_PAY = 'Have_a_Nice_Pay___LG_Pay',
}

export function getStatusCode(error: APIError): number {
  switch (error) {
    case APIError.TOKEN_NOT_FOUND:
      return 400;
    case APIError.INVALID_TOKEN:
    case APIError.INSUFFICIENT_PERMISSION:
    case APIError.USER_NOT_FOUND:
      return 403;
    case APIError.HAVE_A_NICE_PAY:
      return 418;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  ((n: never) => {})(error);
}

export function buildError(
  error: APIError,
  description?: string,
): {
  error: APIError;
  description?: string;
} {
  return {
    error,
    description,
  };
}

export function sendError(rep: FastifyReply, error: APIError, description?: string): void {
  const payload = buildError(error, description);
  rep.send(payload);
}
