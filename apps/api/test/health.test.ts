/**
 * Health endpoint test
 */

import { createServer } from '../src/server';

describe('Health endpoint', () => {
  it('should return OK status', async () => {
    const server = await createServer();

    const response = await server.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toMatchObject({
      status: 'ok',
    });

    await server.close();
  });
});
