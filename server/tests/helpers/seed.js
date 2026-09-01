// tests/helpers/seed.js
//
// Baseline account creation for tests — mirrors scripts/seed-user.js's
// logic (since there is still no API path to create the very first
// SuperAdmin/GymOwner/Receptionist account), but written against
// testPrisma so it only ever touches the test database.

const bcrypt = require('bcrypt');
const testPrisma = require('./testDb');

const DEFAULT_PASSWORD = 'TestPass123!';
const BCRYPT_COST_FACTOR = 4;

async function createStaffUser(role, emailPrefix) {
  const email = `${emailPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_COST_FACTOR);

  const user = await testPrisma.user.create({
    data: {
      email,
      password_hash: passwordHash,
      role,
      account_status: 'Active',
      must_change_password: false,
    },
  });

  return { ...user, password: DEFAULT_PASSWORD };
}

/**
 * Direct-insert seeding for Notification — mirrors scripts/seed-
 * notification.js's manual approach, since there is no POST
 * /notifications endpoint by design (BR-11.1: system-generated only).
 * status defaults to 'Sent' unless overridden — pass status: 'Failed'
 * to test the resend success path, since resendNotification only
 * allows Pending/Failed.
 */
async function createNotification({ recipientUserId, recipientEmail, status = 'Sent' }) {
  return testPrisma.notification.create({
    data: {
      notification_type: 'MembershipActivated',
      recipient_user_id: recipientUserId,
      recipient_email: recipientEmail,
      related_entity_type: 'Membership',
      related_entity_id: recipientUserId, // placeholder — no real FK constraint on this polymorphic reference (BR-11.2)
      status,
    },
  });
}

module.exports = {
  DEFAULT_PASSWORD,
  createSuperAdmin: () => createStaffUser('SuperAdmin', 'superadmin'),
  createGymOwner: () => createStaffUser('GymOwner', 'gymowner'),
  createReceptionist: () => createStaffUser('Receptionist', 'receptionist'),
  createNotification,
};
