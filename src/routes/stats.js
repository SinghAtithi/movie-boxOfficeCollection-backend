'use strict';

const store = require('../store');

/**
 * GET /api/v1/stats
 * 
 * Returns the current interpolated box office statistics.
 * Designed to be cached by Cloudflare (s-maxage=5) and browser (max-age=1).
 */
async function statsRoutes(fastify) {
  fastify.get('/api/v1/stats', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                totalRevenue: { type: 'number' },
                lastTwentyFourHourRevenue: { type: 'number' },
                totalTicketSales: { type: 'number' },
                _meta: {
                  type: 'object',
                  properties: {
                    lastUpdatedAt: { type: ['string', 'null'] },
                    elapsedSeconds: { type: 'number' },
                  },
                },
              },
            },
            timestamp: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      // Set aggressive caching headers for Cloudflare
      reply.header('Cache-Control', 'public, max-age=1, s-maxage=5, stale-while-revalidate=10');
      reply.header('CDN-Cache-Control', 'public, max-age=5');
      reply.header('Vary', 'Accept-Encoding');

      const data = store.getInterpolated();

      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };
    },
  });
}

module.exports = statsRoutes;
