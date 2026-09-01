// tests/globalSetup.js
//
// Runs ONCE, in its own isolated process, before any test file starts —
// NOT per test file. This replaces per-file afterAll truncation, which
// caused a real race condition: when a per-file truncate hit Jest's
// hook timeout (e.g. during a Neon cold-start), the truncate kept
// running in the background even after Jest moved on to the next file,
// deleting rows (e.g. a just-created GymOwner) out from under that next
// file's in-flight foreign-key-dependent inserts. Truncating once,
// globally, before the suite even begins eliminates that race entirely.

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');

const TABLES_IN_DELETE_ORDER = [
  'notification_attempts', 'notifications',
  'inquiry_follow_up_notes', 'inquiries',
  'audit_logs',
  'booking_reopen_history', 'booking_reschedule_history', 'bookings', 'trainer_availability',
  'personal_records', 'body_measurements',
  'workout_session_reopen_history', 'workout_exercises', 'workout_sessions',
  'nutrition_plan_assignments', 'nutrition_plan_templates',
  'trainer_assignment_history', 'workout_program_assignments',
  'template_exercises', 'workout_program_sessions', 'workout_program_templates',
  'exercise_library_entries',
  'receipts', 'payment_transactions', 'invoices',
  'membership_history', 'memberships', 'membership_plans',
  'attendance',
  'trainers', 'members',
  'password_reset_tokens', 'users',
];

module.exports = async () => {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL is not set — refusing to run tests.');
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.TEST_DATABASE_URL } },
  });

  for (const table of TABLES_IN_DELETE_ORDER) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }

  await prisma.$disconnect();
};
