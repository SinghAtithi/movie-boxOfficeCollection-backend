'use strict';

require('dotenv').config();

const fastify = require('fastify')({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  },
  trustProxy: true, // Required when behind Cloudflare
});

const store = require('./store');
const rateLimitPlugin = require('./plugins/rateLimit');
const securityPlugin = require('./plugins/security');
const statsRoutes = require('./routes/stats');
const ingestRoutes = require('./routes/ingest');

// ── Health Check ──────────────────────────────────────
fastify.get('/health', async () => ({
  status: 'ok',
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
}));

// ── Register Plugins ──────────────────────────────────
async function build() {
  await fastify.register(require('@fastify/cors'), {
    origin: '*',
  });
  await fastify.register(rateLimitPlugin);
  await fastify.register(securityPlugin);

  // ── Register Routes ────────────────────────────────
  await fastify.register(statsRoutes);
  await fastify.register(ingestRoutes);

  return fastify;
}

// ── Start Server ──────────────────────────────────────
async function start() {
  try {
    const app = await build();

    const port = parseInt(process.env.PORT, 10) || 3000;
    const host = process.env.HOST || '0.0.0.0';

    await app.listen({ port, host });

    // Start the 1-second interpolation timer
    store.startInterpolation();

    console.log(`\n🚀 Server running at http://${host}:${port}`);
    console.log(`📊 GET  stats  → http://${host}:${port}/api/v1/stats`);
    console.log(`🔑 POST ingest → http://${host}:${port}/api/v1/mx9k7z3q8w2p`);
    console.log(`💚 Health      → http://${host}:${port}/health`);
    console.log(`\n🛡️  Rate limit: 100 req/min per IP`);
    console.log(`⏱️  Interpolation: ticking every 1 second\n`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// ── Graceful Shutdown ─────────────────────────────────
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  store.stopInterpolation();
  await fastify.close();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

start();
