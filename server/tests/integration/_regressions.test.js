// tests/integration/_regressions.test.js
//
// Regression tests for bugs discovered during manual/automated testing
// that don't map cleanly to one specific feature slice's own test file.
// Each test here should reference the exact bug it guards against.

const request = require('supertest');
const app = require('../helpers/testApp');
const testPrisma = require('../helpers/testDb');
const { createGymOwner, DEFAULT_PASSWORD } = require('../helpers/seed');
const { loginAs } = require('../helpers/auth');

describe('Regression: Progress module role constants', () => {
  let memberToken;

  beforeAll(async () => {
    const gymOwner = await createGymOwner();
    const gymOwnerToken = await loginAs(app, gymOwner.email, DEFAULT_PASSWORD);

    const memberEmail = `regression-progress-${Date.now()}@test.local`;
    const memberResponse = await request(app)
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${gymOwnerToken}`)
      .send({
        email: memberEmail,
        first_name: 'Progress',
        last_name: 'Regression',
        phone_number: '0700000001',
        date_of_birth: '1992-01-01',
        gender: 'Female',
        emergency_contact_name: 'Emergency Contact',
        emergency_contact_phone: '0711111112',
      });
    const member = memberResponse.body.data;
    memberToken = await loginAs(app, memberEmail, member.temporary_password);
  }, 60000);

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  /**
   * Guards against: progress.constants.js originally shipped with a
   * pre-correction draft where MEASUREMENT_LIST_ROLES and PR_LIST_ROLES
   * both excluded Member — meaning a Member could view a single body
   * measurement or personal record by id, but not list their own
   * history at all. Found manually during Slice 2's smoke test, fixed
   * on disk, but never had an automated guard until now.
   */
  it('allows a Member to list their own body measurements without 403', async () => {
    const response = await request(app)
      .get('/api/v1/body-measurements')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(response.status).toBe(200);
    expect(response.body.error).toBeNull();
  });

  it('allows a Member to list their own personal records without 403', async () => {
    const response = await request(app)
      .get('/api/v1/personal-records')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(response.status).toBe(200);
    expect(response.body.error).toBeNull();
  });
});

describe.skip('Regression: combineDateAndTime timezone independence', () => {
  /**
   * Guards against: booking.service.js's combineDateAndTime() uses
   * Date.setHours() (host-machine-local-timezone interpretation)
   * instead of setUTCHours()/Date.UTC() — meaning identical
   * booking_date/start_time input produces DIFFERENT stored UTC values
   * depending on what timezone the server process is running in.
   * Confirmed present as of this test's authoring; not yet fixed.
   *
   * NOT actually testable via HTTP requests against a single test
   * runner in one timezone — the bug only manifests when comparing
   * behavior ACROSS different host timezones, which a single CI/test
   * machine cannot exercise by making requests alone. A true test would
   * need to either (a) directly unit-test combineDateAndTime with the
   * process's TZ environment variable forced to different values across
   * runs, or (b) mock Date's internal timezone behavior — neither of
   * which this integration-test-style file is set up for.
   *
   * Skipped (not just .todo) because the fix itself hasn't landed yet;
   * once combineDateAndTime is switched to setUTCHours, promote this to
   * a proper unit test in a new tests/unit/ directory testing the
   * function directly and removing the timezone dependency from the
   * test itself entirely (call it with a fixed date/time string, assert
   * the exact UTC output, no ambient TZ concerns at all).
   */
  it.todo('should produce identical UTC timestamps regardless of host timezone');
});
