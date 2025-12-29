/**
 * Fastify server setup
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { logger } from './lib/logger';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';

// Routes
import runsRoutes from './routes/runs';
import evidenceRoutes from './routes/evidence';

export async function createServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger,
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
