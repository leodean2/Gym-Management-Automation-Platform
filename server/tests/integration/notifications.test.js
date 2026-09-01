// tests/integration/notifications.test.js
//
// Automates Slice 5 (Notifications) — since there's no POST
// /notifications endpoint (BR-11.1: system-generated only), test data
// is seeded via direct insert (createNotification), same as the manual
// scripts/seed-notification.js approach used earlier. Covers: recipient
// scoping (own vs. cross-user), mark-read + idempotency, the schema
// correction made mid-build (Read status + read_at), and resend +
// attempt-numbering.

const request = require('supertest');
const app = require('../helpers/testApp');
const testPrisma = require('../helpers/testDb');
const {
  createSuperAdmin,
  createReceptionist,
  createNotification,
  DEFAULT_PASSWORD,
} = require('../helpers/seed');
const { loginAs } = require('../helpers/auth');

describe('Slice 5 — Notifications', () => {
  let superAdminToken;
  let receptionToken;
  let memberAUser;
  let memberBUser;
  let memberAToken;
  let memberBToken;

  beforeAll(async () => {
    const superAdmin = await createSuperAdmin();
    superAdminToken = await loginAs(app, superAdmin.email, DEFAULT_PASSWORD);

    const receptionist = await createReceptionist();
    receptionToken = await loginAs(app, receptionist.email, DEFAULT_PASSWORD);

    // Register two real Members via the API so we have genuine User
    // rows to act as notification recipients, and can log in as each to
    // test recipient-scoping (own vs. cross-user access).
    const memberAEmail = `member-a-${Date.now()}@test.local`;
    const memberAResponse = await request(app)
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${receptionToken}`)
      .send({
        email: memberAEmail,
        first_name: 'Jane',
        last_name: 'First',
        phone_number: '0712345678',
        date_of_birth: '1995-06-15',
        gender: 'Female',
        emergency_contact_name: 'Emergency Contact',
        emergency_contact_phone: '0798765432',
      });
    memberAUser = memberAResponse.body.data;
    memberAToken = await loginAs(app, memberAEmail, memberAUser.temporary_password);

    const memberBEmail = `member-b-${Date.now()}@test.local`;
    const memberBResponse = await request(app)
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${receptionToken}`)
      .send({
        email: memberBEmail,
        first_name: 'Sara',
        last_name: 'Second',
        phone_number: '0722333444',
        date_of_birth: '1998-03-10',
        gender: 'Female',
        emergency_contact_name: 'Emergency Contact',
        emergency_contact_phone: '0733444555',
      });
    memberBUser = memberBResponse.body.data;
    memberBToken = await loginAs(app, memberBEmail, memberBUser.temporary_password);
  }, 60000);

  afterAll(async () => {
    await testPrisma.$disconnect();
  }, 30000);

  it('scopes recipient access correctly: owner can view, a different user cannot', async () => {
    const notification = await createNotification({
      recipientUserId: memberAUser.user_id,
      recipientEmail: (await testPrisma.user.findUnique({ where: { id: memberAUser.user_id } })).email,
    });

    // Owner can view.
    const ownerView = await request(app)
      .get(`/api/v1/notifications/${notification.id}`)
      .set('Authorization', `Bearer ${memberAToken}`);
    expect(ownerView.status).toBe(200);
    expect(ownerView.body.data.id).toBe(notification.id);

    // Owner sees it in their own list.
    const ownerList = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${memberAToken}`);
    expect(ownerList.body.data.items.map((n) => n.id)).toContain(notification.id);

    // A different user is blocked.
    const strangerView = await request(app)
      .get(`/api/v1/notifications/${notification.id}`)
      .set('Authorization', `Bearer ${memberBToken}`);
    expect(strangerView.status).toBe(403);
  });

  it('marks a notification as read, correctly, and idempotently', async () => {
    const memberAEmail = (await testPrisma.user.findUnique({ where: { id: memberAUser.user_id } })).email;
    const notification = await createNotification({
      recipientUserId: memberAUser.user_id,
      recipientEmail: memberAEmail,
    });

    // Mark read.
    const firstMarkRead = await request(app)
      .patch(`/api/v1/notifications/${notification.id}/read`)
      .set('Authorization', `Bearer ${memberAToken}`);
    expect(firstMarkRead.status).toBe(200);

    // Confirm the schema-correction fields (Read status + read_at) are
    // actually populated — this is the part that required a live
    // migration mid-build to even be possible.
    const afterFirstRead = await testPrisma.notification.findUnique({ where: { id: notification.id } });
    expect(afterFirstRead.status).toBe('Read');
    expect(afterFirstRead.read_at).not.toBeNull();

    // Idempotency: marking read again must succeed, not error.
    const secondMarkRead = await request(app)
      .patch(`/api/v1/notifications/${notification.id}/read`)
      .set('Authorization', `Bearer ${memberAToken}`);
    expect(secondMarkRead.status).toBe(200);
  });

  it('rejects resend on a non-resendable (Read) notification, then succeeds on a Failed one with correct attempt numbering', async () => {
    const memberAEmail = (await testPrisma.user.findUnique({ where: { id: memberAUser.user_id } })).email;

    // --- Rejection path: Read notifications cannot be resent. ---
    const readNotification = await createNotification({
      recipientUserId: memberAUser.user_id,
      recipientEmail: memberAEmail,
      status: 'Read',
    });

    const rejectedResend = await request(app)
      .post(`/api/v1/notifications/${readNotification.id}/resend`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(rejectedResend.status).toBe(409);
    expect(rejectedResend.body.error.code).toBe('NOTIFICATION_NOT_RESENDABLE');

    // --- Success path: Failed notification can be resent, attempt_number increments. ---
    const failedNotification = await createNotification({
      recipientUserId: memberAUser.user_id,
      recipientEmail: memberAEmail,
      status: 'Failed',
    });

    const firstResend = await request(app)
      .post(`/api/v1/notifications/${failedNotification.id}/resend`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(firstResend.status).toBe(200);

    const secondResend = await request(app)
      .post(`/api/v1/notifications/${failedNotification.id}/resend`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(secondResend.status).toBe(200);

    const attemptsResponse = await request(app)
      .get(`/api/v1/notifications/${failedNotification.id}/attempts`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(attemptsResponse.status).toBe(200);
    const attempts = attemptsResponse.body.data;
    expect(attempts).toHaveLength(2);

    const attemptNumbers = attempts.map((a) => a.attempt_number).sort();
    expect(attemptNumbers).toEqual([1, 2]);
    attempts.forEach((a) => expect(a.status).toBe('Queued'));
  });

  it('rejects resend attempts from a non-staff role (Receptionist is not in RESEND_ROLES)', async () => {
    const memberAEmail = (await testPrisma.user.findUnique({ where: { id: memberAUser.user_id } })).email;
    const failedNotification = await createNotification({
      recipientUserId: memberAUser.user_id,
      recipientEmail: memberAEmail,
      status: 'Failed',
    });

    const response = await request(app)
      .post(`/api/v1/notifications/${failedNotification.id}/resend`)
      .set('Authorization', `Bearer ${receptionToken}`);

    expect(response.status).toBe(403);
  });
});
