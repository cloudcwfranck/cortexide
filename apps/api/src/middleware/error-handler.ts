/**
 * Global error handler
 */

import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../lib/logger';

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  logger.error(
    {
      err: error,
      reqId: request.id,
      method: request.method,
      url: request.url,
    },
    'Request error'
  );

  // Don't leak internal errors in production
  const isDev = process.env.NODE_ENV !== 'production';

  return reply.code(error.statusCode || 500).send({
    error: error.name || 'InternalServerError',
    message: error.message,
    ...(isDev && { stack: error.stack }),
  });
}
