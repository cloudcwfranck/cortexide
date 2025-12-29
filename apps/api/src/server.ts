/**
 * Fastify server setup
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';

// Routes
import runsRoutes from './routes/runs';
import evidenceRoutes from './routes/evidence';

export async function createServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
    requestIdLogLabel: 'reqId',
  });

  // Plugins
  await server.register(cors, {
    origin: true, // v0.1: allow all; v1.0: configure properly
  });

  // Middleware
  server.addHook('onRequest', authMiddleware);

  // Routes
  await server.register(runsRoutes, { prefix: '/api/v1/runs' });
  await server.register(evidenceRoutes, { prefix: '/api/v1/runs' });

  // Health check
  server.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  // Error handler
  server.setErrorHandler(errorHandler);

  return server;
}
