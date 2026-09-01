// tests/helpers/cleanup.js
//
// Because TEST_DATABASE_URL points at a dedicated, disposable database
// (never dev), a full truncate between test suites is safe and much
// simpler than tracking/deleting only records a given test created.

const testPrisma = require('./testDb');

const TABLES_IN_DELETE_ORDER = [
  'notification_attempts',
  'notifications',
  'inquiry_follow_up_notes',
  'inquiries',
  'audit_logs',
  'booking_reopen_history',
  'booking_reschedule_history',
  'bookings',
  'trainer_availability',
  'personal_records',
  'body_measurements',
  'workout_session_reopen_history',
  'workout_exercises',
  'workout_sessions',
  'nutrition_plan_assignments',
  'nutrition_plan_templates',
  'trainer_assignment_history',
  'workout_program_assignments',
  'template_exercises',
  'workout_program_sessions',
  'workout_program_templates',
  'exercise_library_entries',
  'receipts',
  'payment_transactions',
  'invoices',
  'membership_history',
  'memberships',
  'membership_plans',
  'attendance',
  'trainers',
  'members',
  'password_reset_tokens',
  'users',
];

async function truncateAll() {
  for (const table of TABLES_IN_DELETE_ORDER) {
    await testPrisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }
}

/**
 * Wraps truncateAll so a failure (e.g. Neon's test compute going idle
 * mid-teardown) never prevents the Prisma client from disconnecting
 * afterward — an uncaught truncate error previously left
 * testPrisma.$disconnect() unreached, which is what caused Jest's "did
 * not exit" open-handle warning. Every test file's afterAll should call
 * THIS, not truncateAll + $disconnect separately.
 */
async function teardown() {
  try {
    await truncateAll();
  } catch (err) {
    console.error('truncateAll() failed during teardown — some test data may persist:', err.message);
  } finally {
    await testPrisma.$disconnect();
  }
}

module.exports = { truncateAll, teardown };
