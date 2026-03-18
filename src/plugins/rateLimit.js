'use strict';

const fp = require('fastify-plugin');
const fastifyRateLimit = require('@fastify/rate-limit');

/**
 * Rate limiting plugin.
 * 
 * Global: 100 requests/minute per IP.
 * Individual routes can override with their own config.rateLimit.
 */
async function rateLimitPlugin(fastify) {
  await fastify.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
    ban: 3, // After 3 consecutive 429s, ban for the remaining window
    cache: 10000, // Track up to 10k unique IPs
    allowList: [], // Add trusted IPs here if needed
    keyGenerator: (request) => {
      // Use X-Forwarded-For when behind Cloudflare, fallback to raw IP
      return request.headers['cf-connecting-ip']
        || request.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || request.ip;
    },
    errorResponseBuilder: (request, context) => {
      return {
        success: false,
        error: 'Too many requests. Please slow down.',
        retryAfter: Math.ceil(context.ttl / 1000),
      };
    },
  });
}

module.exports = fp(rateLimitPlugin, {
  name: 'rate-limit-plugin',
});
