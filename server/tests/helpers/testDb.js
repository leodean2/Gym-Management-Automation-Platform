// tests/helpers/testDb.js
//
// A Prisma client instance dedicated to the TEST database, entirely
// independent of src/config/db.js (which is hardwired to whatever
// DATABASE_URL happens to be in .env at the moment). This means running
// tests never depends on manually swapping .env values or shell
// environment variables — the exact class of problem that cost real
// time during test-database setup. TEST_DATABASE_URL is loaded here,
// directly, via dotenv, and used ONLY for this client.

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { PrismaClient } = require('@prisma/client');

if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    'TEST_DATABASE_URL is not set in .env — tests must never run against DATABASE_URL (your dev database).'
  );
}

const testPrisma = new PrismaClient({
  datasources: {
    db: { url: process.env.TEST_DATABASE_URL },
  },
});

module.exports = testPrisma;
