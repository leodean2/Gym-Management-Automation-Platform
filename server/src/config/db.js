/**
 * Single shared Prisma Client instance.
 *
 * Never `new PrismaClient()` inside a route/service file - that would open a
 * fresh connection pool per import in dev (hot reload) and per request under
 * some patterns. Import `prisma` from here everywhere instead.
 */
const { PrismaClient } = require('@prisma/client');
const { nodeEnv } = require('./env');

const prisma = new PrismaClient({
  log: nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
