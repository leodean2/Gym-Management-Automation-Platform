// tests/integration/memberships.test.js
//
// Automates Slice 1 (Membership Activation) — the exact manual curl
// sequence already verified against Neon: create plan -> register
// member -> create membership (Pending + Invoice) -> record payment ->
// assert Membership Active, correct expiry math, MembershipHistory
// written, Receipt created.

const request = require('supertest');
const app = require('../helpers/testApp');
const testPrisma = require('../helpers/testDb');
const { createGymOwner, DEFAULT_PASSWORD } = require('../helpers/seed');
const { loginAs } = require('../helpers/auth');

describe('Slice 1 — Membership Activation', () => {
  let gymOwnerToken;

  beforeAll(async () => {
    const gymOwner = await createGymOwner();
    gymOwnerToken = await loginAs(app, gymOwner.email, DEFAULT_PASSWORD);
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it('activates a membership end-to-end and produces correct dates, history, and a receipt', async () => {
    // --- Create Membership Plan ---
    const planName = `Gold Monthly ${Date.now()}`;
    const planResponse = await request(app)
      .post('/api/v1/membership-plans')
      .set('Authorization', `Bearer ${gymOwnerToken}`)
      .send({
        name: planName,
        description: 'Full gym access, monthly billing',
        duration_days: 30,
        price: 5000,
      });

    expect(planResponse.status).toBe(201);
    const plan = planResponse.body.data;
    expect(plan.duration_days).toBe(30);

    // --- Register Member ---
    const memberEmail = `member-${Date.now()}@test.local`;
    const memberResponse = await request(app)
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${gymOwnerToken}`)
      .send({
        email: memberEmail,
        first_name: 'Jane',
        last_name: 'Test',
        phone_number: '0712345678',
        date_of_birth: '1995-06-15',
        gender: 'Female',
        emergency_contact_name: 'Emergency Contact',
        emergency_contact_phone: '0798765432',
      });

    expect(memberResponse.status).toBe(201);
    const member = memberResponse.body.data;
    expect(member.membership_number).toMatch(/^MEM-\d{4}-\d{6}$/);

    // --- Create Membership (should be Pending, with a Pending Invoice) ---
    const createMembershipResponse = await request(app)
      .post('/api/v1/memberships')
      .set('Authorization', `Bearer ${gymOwnerToken}`)
      .send({
        member_id: member.id,
        membership_plan_id: plan.id,
      });

    expect(createMembershipResponse.status).toBe(201);
    const { membership, invoice } = createMembershipResponse.body.data;

    expect(membership.status).toBe('Pending');
    expect(membership.start_date).toBeNull();
    expect(membership.expiry_date).toBeNull();

    expect(invoice.status).toBe('Pending');
    expect(Number(invoice.amount_due)).toBe(5000);
    // Confirms the plan-snapshot fix added this session actually persists.
    expect(invoice.membership_plan_id).toBe(plan.id);

    // --- Record Payment (triggers activateMembershipFromPayment) ---
    const payResponse = await request(app)
      .post(`/api/v1/invoices/${invoice.id}/pay`)
      .set('Authorization', `Bearer ${gymOwnerToken}`)
      .send({
        amount_paid: 5000,
        payment_method: 'Cash',
        transaction_reference: 'TEST-REF-001',
      });

    expect(payResponse.status).toBe(201);
    const { payment_transaction, receipt, membership: activatedMembership } = payResponse.body.data;

    // --- Assert: PaymentTransaction ---
    expect(payment_transaction.status).toBe('Successful');
    expect(Number(payment_transaction.amount_paid)).toBe(5000);

    // --- Assert: Receipt was created ---
    expect(receipt).toBeDefined();
    expect(receipt.receipt_number).toMatch(/^RCT-\d{4}-\d{6}$/);
    expect(receipt.status).toBe('Issued');

    // --- Assert: Membership is now Active with correct date math ---
    expect(activatedMembership.status).toBe('Active');
    expect(activatedMembership.start_date).not.toBeNull();
    expect(activatedMembership.expiry_date).not.toBeNull();

    const startDate = new Date(activatedMembership.start_date);
    const expiryDate = new Date(activatedMembership.expiry_date);
    const actualDurationDays = Math.round((expiryDate - startDate) / (1000 * 60 * 60 * 24));
    expect(actualDurationDays).toBe(30);

    // start_date is a date-only column (@db.Date in schema.prisma) — it
    // gets truncated to midnight UTC regardless of what time the
    // payment actually happened, so comparing it against "now" with a
    // tight timestamp tolerance is the wrong test. Instead, confirm it's
    // truncated to midnight (sanity-checking the column behaves as a
    // pure date) and that it's today's calendar date in UTC.
    expect(startDate.getUTCHours()).toBe(0);
    expect(startDate.getUTCMinutes()).toBe(0);

    const today = new Date();
    const isSameUtcDate =
      startDate.getUTCFullYear() === today.getUTCFullYear() &&
      startDate.getUTCMonth() === today.getUTCMonth() &&
      startDate.getUTCDate() === today.getUTCDate();
    expect(isSameUtcDate).toBe(true);
    // --- Assert: Invoice is now Paid ---
    const getInvoiceResponse = await request(app)
      .get(`/api/v1/invoices/${invoice.id}`)
      .set('Authorization', `Bearer ${gymOwnerToken}`);
    expect(getInvoiceResponse.body.data.status).toBe('Paid');

    // --- Assert: MembershipHistory row was written with event_type InitialActivation ---
    const historyRows = await testPrisma.membershipHistory.findMany({
      where: { membership_id: membership.id },
    });
    expect(historyRows).toHaveLength(1);
    expect(historyRows[0].event_type).toBe('InitialActivation');
    expect(historyRows[0].invoice_id).toBe(invoice.id);
    expect(historyRows[0].membership_plan_id).toBe(plan.id);
  });

  it('regression: renewing into a DIFFERENT plan uses the NEW plan\'s duration, not the old one, via the Invoice snapshot', async () => {
    // --- Create two plans with different durations ---
    const oldPlanResponse = await request(app)
      .post('/api/v1/membership-plans')
      .set('Authorization', `Bearer ${gymOwnerToken}`)
      .send({
        name: `Silver Monthly ${Date.now()}`,
        description: '30-day plan',
        duration_days: 30,
        price: 3000,
      });
    const oldPlan = oldPlanResponse.body.data;

    const newPlanResponse = await request(app)
      .post('/api/v1/membership-plans')
      .set('Authorization', `Bearer ${gymOwnerToken}`)
      .send({
        name: `Platinum Quarterly ${Date.now()}`,
        description: '90-day plan',
        duration_days: 90,
        price: 12000,
      });
    const newPlan = newPlanResponse.body.data;

    // --- Register a member and activate them on the OLD plan first ---
    const memberEmail = `regression-member-${Date.now()}@test.local`;
    const memberResponse = await request(app)
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${gymOwnerToken}`)
      .send({
        email: memberEmail,
        first_name: 'Regression',
        last_name: 'Test',
        phone_number: '0700000000',
        date_of_birth: '1990-01-01',
        gender: 'Male',
        emergency_contact_name: 'Emergency Contact',
        emergency_contact_phone: '0711111111',
      });
    const member = memberResponse.body.data;

    const createMembershipResponse = await request(app)
      .post('/api/v1/memberships')
      .set('Authorization', `Bearer ${gymOwnerToken}`)
      .send({ member_id: member.id, membership_plan_id: oldPlan.id });
    const { invoice: firstInvoice } = createMembershipResponse.body.data;

    const firstPayResponse = await request(app)
      .post(`/api/v1/invoices/${firstInvoice.id}/pay`)
      .set('Authorization', `Bearer ${gymOwnerToken}`)
      .send({ amount_paid: 3000, payment_method: 'Cash', transaction_reference: 'REG-001' });

    const membershipId = firstPayResponse.body.data.membership.id;

    // --- Renew, switching to the NEW (90-day) plan ---
    const renewResponse = await request(app)
      .post(`/api/v1/memberships/${membershipId}/renew`)
      .set('Authorization', `Bearer ${gymOwnerToken}`)
      .send({ membership_plan_id: newPlan.id });

    expect(renewResponse.status).toBe(201);
    const renewalInvoice = renewResponse.body.data.invoice;

    // The bug this test guards against: renewMembership previously
    // never persisted a plan change anywhere reachable at payment time.
    // The fix was snapshotting it on the Invoice itself.
    expect(renewalInvoice.membership_plan_id).toBe(newPlan.id);
    expect(Number(renewalInvoice.amount_due)).toBe(12000);

    // --- Pay the renewal invoice ---
    const renewalPayResponse = await request(app)
      .post(`/api/v1/invoices/${renewalInvoice.id}/pay`)
      .set('Authorization', `Bearer ${gymOwnerToken}`)
      .send({ amount_paid: 12000, payment_method: 'Cash', transaction_reference: 'REG-002' });

    expect(renewalPayResponse.status).toBe(201);
    const renewedMembership = renewalPayResponse.body.data.membership;

    // --- The actual regression assertion: duration must be 90 days
    //     (the NEW plan), not 30 (the old one) ---
    const startDate = new Date(renewedMembership.start_date);
    const expiryDate = new Date(renewedMembership.expiry_date);
    const actualDurationDays = Math.round((expiryDate - startDate) / (1000 * 60 * 60 * 24));
    expect(actualDurationDays).toBe(90);

    // Membership.membership_plan_id must now reflect the new plan too —
    // updated only AFTER payment succeeds, never at renewal request time.
    expect(renewedMembership.membership_plan_id).toBe(newPlan.id);

    // --- MembershipHistory should show event_type: Renewal, referencing the new plan ---
    const historyRows = await testPrisma.membershipHistory.findMany({
      where: { membership_id: membershipId },
      orderBy: { recorded_at: 'asc' },
    });
    expect(historyRows).toHaveLength(2); // InitialActivation + Renewal
    expect(historyRows[1].event_type).toBe('Renewal');
    expect(historyRows[1].membership_plan_id).toBe(newPlan.id);
  });
});