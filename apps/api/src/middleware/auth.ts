/**
 * Authentication middleware
 *
 * v0.1: Hardcoded API key
 * v0.3+: OIDC + JWT + RBAC
 */

import { FastifyRequest, FastifyReply } from 'fastify';

const HARDCODED_API_KEY = 'cortexide-dev-key-v01';

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  // Skip auth for health check
  if (request.url === '/health') {
    return;
  }

  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Missing Authorization header',
    });
  }

  const token = authHeader.replace('Bearer ', '');

  if (token !== HARDCODED_API_KEY) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid API key',
    });
  }

  // v0.1: Set default tenant for single-tenant mode
  // v0.3+: Extract tenant_id from JWT claims
  (request as any).tenant_id = 't_default';
}
