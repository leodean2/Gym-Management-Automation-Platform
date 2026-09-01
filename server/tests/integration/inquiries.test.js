// tests/integration/inquiries.test.js
//
// Automates Slice 4 (Inquiry) — the trickiest business logic in the
// whole system: the status/outcome conditional chain. Walks the exact
// truth table verified manually:
//   Submit (public, no auth) -> Contacted (no outcome) ->
//   reject outcome while not Closed -> Close + outcome together ->
//   correct outcome while already Closed (no status field) ->
//   reject reopening a Closed inquiry.

const request = require('supertest');
const app = require('../helpers/testApp');
const testPrisma = require('../helpers/testDb');
const { createReceptionist, DEFAULT_PASSWORD } = require('../helpers/seed');
const { loginAs } = require('../helpers/auth');

describe('Slice 4 — Inquiry', () => {
  let receptionToken;
  let inquiryId;

  beforeAll(async () => {
    const receptionist = await createReceptionist();
    receptionToken = await loginAs(app, receptionist.email, DEFAULT_PASSWORD);
  }, 60000);

  afterAll(async () => {
    await testPrisma.$disconnect();
  }, 30000);

  it('accepts a public submission with no Authorization header at all', async () => {
    const response = await request(app)
      .post('/api/v1/inquiries')
      .send({
        full_name: 'Prospective Person',
        email: `prospect-${Date.now()}@test.local`,
        phone_number: '0700111222',
        subject: 'Membership',
        message: 'I would like to ask about membership options.',
      });

    expect(response.status).toBe(201);
    // Deliberately minimal response shape for an anonymous caller — not
    // the full inquiry object.
    expect(response.body.data.status).toBe('New');
    expect(Object.keys(response.body.data).sort()).toEqual(['created_at', 'id', 'status']);

    inquiryId = response.body.data.id;
  });

  it('rejects submission with no phone_number (NOT NULL in the frozen schema)', async () => {
    const response = await request(app)
      .post('/api/v1/inquiries')
      .send({
        full_name: 'No Phone Person',
        email: `nophone-${Date.now()}@test.local`,
        message: 'Testing missing phone number.',
      });

    expect(response.status).toBe(400);
  });

  it('moves status to Contacted with no outcome', async () => {
    const response = await request(app)
      .patch(`/api/v1/inquiries/${inquiryId}`)
      .set('Authorization', `Bearer ${receptionToken}`)
      .send({ status: 'Contacted' });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('Contacted');
    expect(response.body.data.outcome).toBeNull();
  });

  it('rejects outcome supplied while status is not (and was not) Closed', async () => {
    const response = await request(app)
      .patch(`/api/v1/inquiries/${inquiryId}`)
      .set('Authorization', `Bearer ${receptionToken}`)
      .send({ status: 'Contacted', outcome: 'Joined' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('OUTCOME_NOT_ALLOWED');
  });

  it('closes the inquiry with an outcome in the same request', async () => {
    const response = await request(app)
      .patch(`/api/v1/inquiries/${inquiryId}`)
      .set('Authorization', `Bearer ${receptionToken}`)
      .send({ status: 'Closed', outcome: 'Joined' });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('Closed');
    expect(response.body.data.outcome).toBe('Joined');
  });

  it('corrects the outcome on an already-Closed inquiry, sending outcome alone with no status field', async () => {
    const response = await request(app)
      .patch(`/api/v1/inquiries/${inquiryId}`)
      .set('Authorization', `Bearer ${receptionToken}`)
      .send({ outcome: 'NotInterested' });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('Closed'); // unchanged
    expect(response.body.data.outcome).toBe('NotInterested'); // corrected
  });

  it('rejects reopening a Closed inquiry', async () => {
    const response = await request(app)
      .patch(`/api/v1/inquiries/${inquiryId}`)
      .set('Authorization', `Bearer ${receptionToken}`)
      .send({ status: 'Contacted' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CANNOT_REOPEN_CLOSED_INQUIRY');

    // Confirm the rejection didn't silently mutate anything.
    const stillClosed = await testPrisma.inquiry.findUnique({ where: { id: inquiryId } });
    expect(stillClosed.status).toBe('Closed');
    expect(stillClosed.outcome).toBe('NotInterested');
  });

  it('adds a follow-up note with created_by derived from the requester, never client-supplied', async () => {
    const response = await request(app)
      .post(`/api/v1/inquiries/${inquiryId}/follow-up-notes`)
      .set('Authorization', `Bearer ${receptionToken}`)
      .send({ note: 'Called back, not interested at this time.' });

    expect(response.status).toBe(201);
    expect(response.body.data.note).toBe('Called back, not interested at this time.');
    expect(response.body.data.created_by).toBeDefined();
  });
});