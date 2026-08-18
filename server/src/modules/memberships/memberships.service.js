const membershipsRepository = require('./memberships.repository');
const AppError = require('../../lib/AppError');

// --- Invoice numbering ------------------------------------------------------

/**
 * Generates a human-readable invoice number (INV-<year>-<sequence>), with
 * the same collision-retry approach used for membership numbers in
 * members.service.js. See docs/schema.prisma for the concurrency-safe
 * sequence note flagged during the ER design phase.
 */
async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
  const yearEnd = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const existingCount = await membershipsRepository.countInvoicesCreatedBetween(yearStart, yearEnd);
  const sequence = existingCount + 1;
  return `INV-${year}-${String(sequence).padStart(6, '0')}`;
}

/**
 * FR-11.6: due date and the 48-hour payment window are independent timers.
 * Default due date is "due immediately at issue" — the payment window
 * itself is not stored, it's computed at query time (created_at + the
 * configured hours) by whatever scheduled job checks for auto-cancellation
 * (see src/jobs/README.md) — not something this module needs to persist.
 */
function calculateDueDate() {
  return new Date();
}

async function createInvoiceForMembership({ membershipId, plan, issuedBy }) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt++) {
    const invoiceNumber = await generateInvoiceNumber();
    try {
      return await membershipsRepository.createInvoice({
        membership_id: membershipId,
        invoice_number: invoiceNumber,
        amount_due: plan.price,
        due_date: calculateDueDate(),
        issued_by: issuedBy,
      });
    } catch (err) {
      if (err.code === 'P2002') {
        lastError = err;
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// --- Membership Plans (FR-3.1 / FR-3.3) -------------------------------------

async function createPlan(input, actingUser) {
  const existing = await membershipsRepository.findPlanByName(input.name);
  if (existing) {
    throw AppError.conflict('PLAN_NAME_TAKEN', 'A plan with this name already exists');
  }

  return membershipsRepository.createPlan({
    ...input,
    created_by: actingUser.id,
  });
}

async function listPlans(query) {
  return membershipsRepository.listPlans(query);
}

async function updatePlan(planId, updates, actingUser) {
  const plan = await membershipsRepository.findPlanById(planId);
  if (!plan) {
    throw AppError.notFound('Membership plan not found');
  }

  // is_active (boolean input) maps onto the frozen `status` enum.
  const data = { ...updates, updated_by: actingUser.id };
  if ('is_active' in updates) {
    data.status = updates.is_active ? 'Active' : 'Inactive';
    delete data.is_active;
  }

  return membershipsRepository.updatePlan(planId, data);
}

// --- Create Membership (FR-3.2) --------------------------------------------

/**
 * Creates a Pending Membership + Pending Invoice. Never activates anything
 * — activation is exclusively the Payments module's responsibility
 * (FR-11.4), triggered by a successful payment against the invoice this
 * function returns.
 */
async function createMembership(input, actingUser) {
  const member = await membershipsRepository.findMemberById(input.member_id);
  if (!member) {
    throw AppError.notFound('Member not found');
  }

  const plan = await membershipsRepository.findPlanById(input.membership_plan_id);
  if (!plan) {
    throw AppError.notFound('Membership plan not found');
  }
  if (plan.status !== 'Active') {
    throw AppError.conflict('PLAN_INACTIVE', 'This membership plan is not currently active');
  }

  const activeMembership = await membershipsRepository.findActiveMembershipByMember(input.member_id);
  if (activeMembership) {
    // FR-3.11 — the database's partial unique index is the ultimate
    // guarantee; this check exists purely to give a clear, friendly error
    // before ever reaching that constraint.
    throw AppError.conflict('MEMBER_ALREADY_ACTIVE', 'This member already has an active membership');
  }

  // Consistency guard, same principle as the renewal duplicate-invoice
  // check below: prevent a member from accumulating multiple unpaid
  // Pending memberships if this endpoint is called more than once before
  // the first is paid.
  const pendingMembership = await membershipsRepository.findPendingMembershipByMember(input.member_id);
  if (pendingMembership) {
    throw AppError.conflict(
      'MEMBER_HAS_PENDING_MEMBERSHIP',
      'This member already has a pending, unpaid membership awaiting payment'
    );
  }

  const membership = await membershipsRepository.createMembership({
    member_id: input.member_id,
    membership_plan_id: input.membership_plan_id,
    status: 'Pending',
    created_by: actingUser.id,
  });

  const invoice = await createInvoiceForMembership({
    membershipId: membership.id,
    plan,
    issuedBy: actingUser.id,
  });

  return { membership, invoice };
}

// --- Renew Membership (FR-3.4a / FR-3.4b, deferred to payment) ------------

/**
 * Creates only a Pending Invoice for the renewal. Deliberately does NOT
 * touch expiry_date, status, or create a MembershipHistory row — per
 * FR-11.4's amendment, the stacking/reset calculation and history record
 * happen only once payment is confirmed (Payments module), identically to
 * how initial activation is deferred.
 */
async function renewMembership(membershipId, input, actingUser) {
  const membership = await membershipsRepository.findMembershipById(membershipId);
  if (!membership) {
    throw AppError.notFound('Membership not found');
  }

  if (membership.status === 'Cancelled') {
    throw AppError.conflict('MEMBERSHIP_CANCELLED', 'A cancelled membership cannot be renewed');
  }

  const existingPendingInvoice = await membershipsRepository.findPendingInvoiceForMembership(membershipId);
  if (existingPendingInvoice) {
    throw AppError.conflict(
      'RENEWAL_ALREADY_PENDING',
      'A renewal invoice for this membership is already pending payment'
    );
  }

  let plan = membership.membership_plan;
  if (input.membership_plan_id && input.membership_plan_id !== membership.membership_plan_id) {
    plan = await membershipsRepository.findPlanById(input.membership_plan_id);
    if (!plan) {
      throw AppError.notFound('Membership plan not found');
    }
    if (plan.status !== 'Active') {
      throw AppError.conflict('PLAN_INACTIVE', 'This membership plan is not currently active');
    }
  }

  const invoice = await createInvoiceForMembership({
    membershipId: membership.id,
    plan,
    issuedBy: actingUser.id,
  });

  return { membership, invoice };
}

// --- View Membership (FR-3.x) -----------------------------------------------

async function getMembership(membershipId, requester) {
  const membership = await membershipsRepository.findMembershipById(membershipId);
  if (!membership) {
    throw AppError.notFound('Membership not found');
  }

  if (requester.role === 'Member' && membership.member.user_id !== requester.id) {
    throw AppError.forbidden('You may only view your own membership');
  }

  // Trainer read access: any Trainer may view (matches the frozen API
  // design's role list). If this should be scoped to only the Trainer's
  // assigned members, apply the same current_trainer_id check used in
  // members.service.js#getMemberProfile.

  return membership;
}

// --- Suspend Membership (FR-3.6) --------------------------------------------

async function suspendMembership(membershipId, { reason }) {
  const membership = await membershipsRepository.findMembershipById(membershipId);
  if (!membership) {
    throw AppError.notFound('Membership not found');
  }

  if (membership.status === 'Pending' || membership.status === 'Cancelled') {
    throw AppError.conflict(
      'CANNOT_SUSPEND',
      `A membership with status ${membership.status} cannot be suspended`
    );
  }
  if (membership.status === 'Suspended') {
    throw AppError.conflict('ALREADY_SUSPENDED', 'This membership is already suspended');
  }

  return membershipsRepository.updateMembership(membershipId, {
    status: 'Suspended',
    suspended_reason: reason,
  });
}

// --- Membership History (FR-3.7) --------------------------------------------

async function getMembershipHistory(memberId, requester) {
  const member = await membershipsRepository.findMemberById(memberId);
  if (!member) {
    throw AppError.notFound('Member not found');
  }

  if (requester.role === 'Member' && member.user_id !== requester.id) {
    throw AppError.forbidden('You may only view your own membership history');
  }

  return membershipsRepository.findHistoryByMember(memberId);
}

module.exports = {
  createPlan,
  listPlans,
  updatePlan,
  createMembership,
  renewMembership,
  getMembership,
  suspendMembership,
  getMembershipHistory,
};
