/**
 * Evidence routes
 *
 * GET /api/v1/runs/:run_id/evidence
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export default async function evidenceRoutes(server: FastifyInstance) {
  // GET /api/v1/runs/:run_id/evidence
  server.get('/:run_id/evidence', async (_request: FastifyRequest, reply: FastifyReply) => {
    // TODO: Implement evidence fetch
    // - Query params: format=json|zip (default: json)
    // - Fetch all evidence_artifacts for run_id
    // - Generate manifest with hashes
    // - If format=zip, create archive
    // - Return evidence bundle
    return reply.code(501).send({
      error: 'NotImplemented',
      message: 'Evidence endpoint not yet implemented',
    });
  });
}
