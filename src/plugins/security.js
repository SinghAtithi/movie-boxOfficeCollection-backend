'use strict';

const fastifyHelmet = require('@fastify/helmet');
const fastifyCors = require('@fastify/cors');

/**
 * Security plugin: Helmet headers + CORS configuration.
 */
async function securityPlugin(fastify) {
  // Helmet — sets various HTTP security headers
  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allows Cloudflare to proxy
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  });

  // CORS — restrict origins
  await fastify.register(fastifyCors, {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Ingest-Key'],
    maxAge: 86400,
  });
}

module.exports = securityPlugin;
