const prisma = require('../../config/db');

/**
 * Only Prisma access lives here. No authorization, no business rules.
 */

// --- Membership Plans -----------------------------------------------------

function createPlan(data) {
  return prisma.membershipPlan.create({ data });
}

function findPlanById(id) {
  return prisma.membershipPlan.findUnique({ where: { id } });
}

function findPlanByName(name) {
  return prisma.membershipPlan.findUnique({ where: { name } });
}

function listPlans({ status, search }) {
  const where = {};
  if (status === 'active') where.status = 'Active';
  if (status === 'inactive') where.status = 'Inactive';
  if (search) where.name = { contains: search, mode: 'insensitive' };

  return prisma.membershipPlan.findMany({ where, orderBy: { name: 'asc' } });
}

function updatePlan(id, data) {
  return prisma.membershipPlan.update({ where: { id }, data });
}

// --- Members (minimal read needed for validation in this module) ---------

function findMemberById(id) {
  return prisma.member.findUnique({ where: { id } });
}

// --- Memberships ------------------------------------------------------------

function findActiveMembershipByMember(memberId) {
  return prisma.membership.findFirst({ where: { member_id: memberId, status: 'Active' } });
}

function findPendingMembershipByMember(memberId) {
  return prisma.membership.findFirst({ where: { member_id: memberId, status: 'Pending' } });
}

function createMembership(data) {
  return prisma.membership.create({ data });
}

function findMembershipById(id) {
  return prisma.membership.findUnique({
    where: { id },
    include: { member: { select: { user_id: true } }, membership_plan: true },
  });
}

function updateMembership(id, data) {
  return prisma.membership.update({ where: { id }, data });
}

function createHistory(data) {
  return prisma.membershipHistory.create({ data });
}

/**
 * Includes membership (with its member_id) and membership_plan — the
 * plan the invoice was actually priced/issued against, which is what
 * activateMembershipFromPayment uses for duration_days, NOT
 * membership.membership_plan (that only reflects the CURRENT paid-for
 * plan, which is exactly what a pending renewal-with-plan-change invoice
 * must not leak into early).
 */
function findInvoiceById(id) {
  return prisma.invoice.findUnique({
    where: { id },
    include: { membership: true, membership_plan: true },
  });
}

// --- Invoices (originate exclusively from Membership events) --------------

function findPendingInvoiceForMembership(membershipId) {
  return prisma.invoice.findFirst({ where: { membership_id: membershipId, status: 'Pending' } });
}

function createInvoice(data) {
  return prisma.invoice.create({ data });
}

function countInvoicesCreatedBetween(start, end) {
  return prisma.invoice.count({ where: { created_at: { gte: start, lt: end } } });
}

// --- Membership History (read-only from this module's perspective — rows
// are written by the Payments module upon activation/renewal payment) -----

function findHistoryByMember(memberId) {
  return prisma.membershipHistory.findMany({
    where: { member_id: memberId },
    orderBy: { recorded_at: 'asc' },
  });
}

module.exports = {
  createPlan,
  findPlanById,
  findPlanByName,
  listPlans,
  updatePlan,
  findMemberById,
  findActiveMembershipByMember,
  findPendingMembershipByMember,
  createMembership,
  findMembershipById,
  updateMembership,
  createHistory,
  findInvoiceById,
  findPendingInvoiceForMembership,
  createInvoice,
  countInvoicesCreatedBetween,
  findHistoryByMember,
};
