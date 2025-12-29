/**
 * Runs routes
 *
 * POST /api/v1/runs/plan
 * POST /api/v1/runs/execute
 * GET /api/v1/runs/:run_id
 * POST /api/v1/runs/:run_id/rollback
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export default async function runsRoutes(server: FastifyInstance) {
  // POST /api/v1/runs/plan
  server.post('/plan', async (_request: FastifyRequest, reply: FastifyReply) => {
    // TODO: Implement plan endpoint
    // - Validate blueprint_id + config
    // - Create runs row with dry_run=true in config
    // - Run phases 2-4 (skip lock) for estimation
    // - Return plan_id + estimated phases
    return reply.code(501).send({
      error: 'NotImplemented',
      message: 'Plan endpoint not yet implemented',
    });
  });

  // POST /api/v1/runs/execute
  server.post('/execute', async (_request: FastifyRequest, reply: FastifyReply) => {
    // TODO: Implement execute endpoint
    // - Validate blueprint_id + config
    // - Create runs row
    // - Trigger PhaseRunner.executeRun()
    // - Return 202 Accepted with run_id + status_url
    return reply.code(501).send({
      error: 'NotImplemented',
      message: 'Execute endpoint not yet implemented',
    });
  });

  // GET /api/v1/runs/:run_id
  server.get('/:run_id', async (_request: FastifyRequest, reply: FastifyReply) => {
    // TODO: Implement get run status
    // - Fetch run from DB
    // - Fetch phase_events
    // - Return run + current_phase + lock_id (if acquired)
    return reply.code(501).send({
      error: 'NotImplemented',
      message: 'Get run endpoint not yet implemented',
    });
  });

  // POST /api/v1/runs/:run_id/rollback
  server.post('/:run_id/rollback', async (_request: FastifyRequest, reply: FastifyReply) => {
    // TODO: Implement rollback
    // - Validate run is in rollback-eligible state
    // - Call adapter.rollback()
    // - Transition state to ROLLED_BACK
    // - Return rollback confirmation
    return reply.code(501).send({
      error: 'NotImplemented',
      message: 'Rollback endpoint not yet implemented',
    });
  });
}
