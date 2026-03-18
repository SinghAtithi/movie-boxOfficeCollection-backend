'use strict';

const store = require('../store');

/**
 * POST /api/v1/mx9k7z3q8w2p
 * 
 * Obfuscated ingestion endpoint. Updates box office data.
 * Requires X-Ingest-Key header matching the server secret.
 * 
 * Body format:
 * {
 *   "current": { totalRevenue, lastTwentyFourHourRevenue, totalTicketSales },
 *   "next24Hours": { totalRevenue, lastTwentyFourHourRevenue, totalTicketSales }
 * }
 */

const dataFieldSchema = {
  type: 'object',
  required: ['totalRevenue', 'lastTwentyFourHourRevenue', 'totalTicketSales'],
  properties: {
    totalRevenue: { type: 'number', minimum: 0 },
    lastTwentyFourHourRevenue: { type: 'number', minimum: 0 },
    totalTicketSales: { type: 'number', minimum: 0 },
  },
  additionalProperties: false,
};

async function ingestRoutes(fastify) {
  fastify.post('/api/v1/mx9k7z3q8w2p', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
      },
    },
    schema: {
      headers: {
        type: 'object',
        required: ['x-ingest-key'],
        properties: {
          'x-ingest-key': { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['current', 'next24Hours'],
        properties: {
          current: dataFieldSchema,
          next24Hours: dataFieldSchema,
        },
        additionalProperties: false,
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
      },
    },
    preHandler: async (request, reply) => {
      const ingestSecret = process.env.INGEST_SECRET || 'default-change-me-in-production';
      const providedKey = request.headers['x-ingest-key'];

      if (!providedKey || providedKey !== ingestSecret) {
        reply.code(401).send({
          success: false,
          error: 'Unauthorized',
        });
        return reply;
      }
    },
    handler: async (request, reply) => {
      const { current, next24Hours } = request.body;

      store.updateData(current, next24Hours);

      // Never cache POST responses
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');

      return {
        success: true,
        message: 'Data updated successfully. Interpolation will begin from current values toward next24Hours targets over the next 24 hours.',
        updatedAt: new Date().toISOString(),
      };
    },
  });
}

module.exports = ingestRoutes;
