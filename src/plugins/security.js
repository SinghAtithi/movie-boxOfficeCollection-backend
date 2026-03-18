'use strict';

const fp = require('fastify-plugin');
const fastifyHelmet = require('@fastify/helmet');
const fastifyCors = require('@fastify/cors');

function getAllowedOrigins() {
  const rawOrigins = process.env.CORS_ORIGINS || '*';

  if (rawOrigins.trim() === '*') {
    return '*';
  }

  return rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * Security plugin: Helmet headers + CORS configuration.
 */
async function securityPlugin(fastify) {
  const allowedOrigins = getAllowedOrigins();

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
    origin(origin, callback) {
      // Allow non-browser requests such as curl, health checks, and server-to-server traffic.
      if (!origin || allowedOrigins === '*') {
        callback(null, true);
        return;
      }

      callback(null, allowedOrigins.includes(origin));
    },
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Ingest-Key'],
    maxAge: 86400,
  });
}

module.exports = fp(securityPlugin, {
  name: 'security-plugin',
});
