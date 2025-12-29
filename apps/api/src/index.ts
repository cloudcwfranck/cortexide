/**
 * Cortexide API Server
 *
 * REST API for deployment orchestration.
 */

import { createServer } from './server';
import { logger } from './lib/logger';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  try {
    const server = await createServer();

    await server.listen({ port: PORT, host: HOST });
    logger.info(`Cortexide API server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
