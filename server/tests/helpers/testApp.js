// tests/helpers/testApp.js
//
// Supertest needs the Express app itself (src/app.js exports it
// directly, never calling .listen()).
//
// Every module's repository imports src/config/db.js directly
// (`const prisma = require('../../config/db')`), hardwired to
// DATABASE_URL. jest.mock() intercepts every one of those requires,
// across the whole app, redirecting them to the test Prisma client —
// this MUST use Jest's own mocking mechanism, not a manual
// require.cache override: Jest maintains its own internal module
// registry (jest-runtime) that is NOT the same object as Node's native
// require.cache, so directly mutating require.cache has no effect on
// what other modules actually receive when they require() something
// during a Jest run. jest.mock() is the only mechanism Jest's own
// require() calls actually respect.

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

jest.mock('../../src/config/db', () => require('./testDb'));

const app = require('../../src/app');

module.exports = app;
