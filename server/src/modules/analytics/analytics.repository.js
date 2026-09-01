const prisma = require('../../config/db');

/**
 * Analytics repository — ONLY database access lives here. This module
 * owns no tables of its own (per the doc's opening line), so every
 * function here queries tables owned by other modules — Membership,
 * Attendance, Booking, Trainer, Invoice, PaymentTransaction. Functions
 * are deliberately generic over an arbitrary {from, to} date window
 * rather than hardcoded to "today"/"week"/"month" — the service computes
 * which concrete dates those quick-filters resolve to and passes them in
 * here, so this file has no date-math of its own.
 */

// =====================================================
// Membership
// =====================================================

function countTotalRegisteredMembers() {
  return prisma.member.count();
}

function countMembershipsByStatus(status) {
  return prisma.membership.count({ where: { status } });
}

/**
 * FR-12.1's "expiring_within_7_days" — Active memberships whose
 * expiry_date falls within [today, today+7days]. Kept generic over an
 * arbitrary window rather than hardcoding 7 days, so the service decides
 * the actual cutoff.
 */
function countMembershipsExpiringWithin({ from, to }) {
  return prisma.membership.count({
    where: { status: 'Active', expiry_date: { gte: from, lte: to } },
  });
}

function countNewRegistrations({ from, to }) {
  return prisma.member.count({ where: { created_at: { gte: from, lte: to } } });
}

// =====================================================
// Attendance
// =====================================================

/**
 * Only Present rows count — Voided (corrected/duplicate) check-ins are
 * excluded, per the doc's note matching FR-4.8's existing treatment.
 */
function countAttendance({ from, to }) {
  return prisma.attendance.count({
    where: { status: 'Present', attendance_date: { gte: from, lte: to } },
  });
}

function countUniqueMembersCheckedIn({ from, to }) {
  return prisma.attendance
    .groupBy({
      by: ['member_id'],
      where: { status: 'Present', attendance_date: { gte: from, lte: to } },
    })
    .then((groups) => groups.length);
}

// =====================================================
// Financial
// =====================================================

/**
 * FR-12.3 / BR-12.6: only Successful PaymentTransaction rows are ever
 * summed for on-screen figures — Voided transactions are excluded here
 * unconditionally. The export path (findPaymentRecordsForExport below)
 * is the one place Voided rows are ever returned.
 */
async function sumRevenue({ from, to }) {
  const result = await prisma.paymentTransaction.aggregate({
    where: { status: 'Successful', payment_date: { gte: from, lte: to } },
    _sum: { amount_paid: true },
  });
  return result._sum.amount_paid ?? 0;
}

async function sumRevenueByPaymentMethod({ from, to }) {
  const groups = await prisma.paymentTransaction.groupBy({
    by: ['payment_method'],
    where: { status: 'Successful', payment_date: { gte: from, lte: to } },
    _sum: { amount_paid: true },
  });

  // Every PaymentMethod key is present in the response even if zero, so
  // the service doesn't have to backfill missing keys itself.
  const byMethod = { Cash: 0, MPesa: 0, Card: 0 };
  for (const group of groups) {
    byMethod[group.payment_method] = group._sum.amount_paid ?? 0;
  }
  return byMethod;
}

async function getInvoiceSummaryByStatus(status) {
  const result = await prisma.invoice.aggregate({
    where: { status },
    _count: true,
    _sum: { amount_due: true },
  });
  return { count: result._count, total_amount_due: result._sum.amount_due ?? 0 };
}

// =====================================================
// Trainers
// =====================================================

function countActiveTrainers() {
  return prisma.trainer.count({ where: { user: { account_status: 'Active' } } });
}

/**
 * Per-trainer workload breakdown for the Trainer Analytics endpoint.
 * assigned_members counts Member rows currently pointing at this
 * trainer (a live snapshot, not range-scoped — "how many members does
 * this trainer currently have," same as the doc's example shows no
 * indication this figure changes with the date range). bookings_in_range
 * and completed_bookings_in_range ARE range-scoped.
 */
async function getTrainerWorkload({ from, to }) {
  const trainers = await prisma.trainer.findMany({
    where: { user: { account_status: 'Active' } },
    select: { id: true, first_name: true, last_name: true },
  });

  const workload = await Promise.all(
    trainers.map(async (trainer) => {
      const [assignedMembers, bookingsInRange, completedBookingsInRange] = await Promise.all([
        prisma.member.count({ where: { current_trainer_id: trainer.id } }),
        prisma.booking.count({
          where: { trainer_id: trainer.id, booking_date: { gte: from, lte: to } },
        }),
        prisma.booking.count({
          where: {
            trainer_id: trainer.id,
            status: 'Completed',
            booking_date: { gte: from, lte: to },
          },
        }),
      ]);

      return {
        trainer_id: trainer.id,
        trainer_name: `${trainer.first_name} ${trainer.last_name}`,
        assigned_members: assignedMembers,
        bookings_in_range: bookingsInRange,
        completed_bookings_in_range: completedBookingsInRange,
      };
    })
  );

  return workload;
}

// =====================================================
// Bookings
// =====================================================

function countBookingsByStatus({ from, to }, status) {
  return prisma.booking.count({
    where: { status, booking_date: { gte: from, lte: to } },
  });
}

function countBookingsInRange({ from, to }) {
  return prisma.booking.count({ where: { booking_date: { gte: from, lte: to } } });
}

/**
 * "Upcoming" is deliberately NOT range-scoped by from/to — it's always
 * "Scheduled bookings from right now forward," matching how the
 * Operational endpoint's upcoming_bookings figure ignores the range
 * param entirely per FR-12.7.
 */
function countUpcomingBookings() {
  return prisma.booking.count({
    where: { status: 'Scheduled', booking_date: { gte: new Date() } },
  });
}

// =====================================================
// Export (BR-12.4 / BR-12.5) — full underlying records, not aggregates
// =====================================================

function findMembershipRecordsForExport({ from, to }) {
  return prisma.membership.findMany({
    where: { created_at: { gte: from, lte: to } },
    include: { member: { select: { first_name: true, last_name: true } }, membership_plan: true },
    orderBy: { created_at: 'desc' },
  });
}

function findAttendanceRecordsForExport({ from, to }) {
  return prisma.attendance.findMany({
    where: { attendance_date: { gte: from, lte: to } },
    include: { member: { select: { first_name: true, last_name: true } } },
    orderBy: { attendance_date: 'desc' },
  });
}

/**
 * Unlike sumRevenue/sumRevenueByPaymentMethod above, this export query
 * has NO status filter at all — per FR-12.9/BR-12.4, financial exports
 * explicitly include Voided transactions, marked as such, since the
 * export is an audit artifact rather than an on-screen summary.
 */
function findPaymentRecordsForExport({ from, to }) {
  return prisma.paymentTransaction.findMany({
    where: { payment_date: { gte: from, lte: to } },
    include: { invoice: { select: { invoice_number: true, membership_id: true } } },
    orderBy: { payment_date: 'desc' },
  });
}

function findBookingRecordsForExport({ from, to }) {
  return prisma.booking.findMany({
    where: { booking_date: { gte: from, lte: to } },
    include: {
      member: { select: { first_name: true, last_name: true } },
      trainer: { select: { first_name: true, last_name: true } },
    },
    orderBy: { booking_date: 'desc' },
  });
}

// Trainer export reuses the same per-trainer workload shape as the
// on-screen endpoint — there's no separate "raw trainer records" concept
// distinct from the workload breakdown itself.
const findTrainerRecordsForExport = getTrainerWorkload;

// =====================================================
// Audit Log (BR-12.5)
// =====================================================

/**
 * Every export call creates this entry — the CSV file itself is never
 * stored, only this metadata, per BR-12.5's "avoid a second copy of
 * sensitive data at rest" decision.
 */
function createExportAuditLog(data) {
  return prisma.auditLog.create({ data });
}

module.exports = {
  countTotalRegisteredMembers,
  countMembershipsByStatus,
  countMembershipsExpiringWithin,
  countNewRegistrations,
  countAttendance,
  countUniqueMembersCheckedIn,
  sumRevenue,
  sumRevenueByPaymentMethod,
  getInvoiceSummaryByStatus,
  countActiveTrainers,
  getTrainerWorkload,
  countBookingsByStatus,
  countBookingsInRange,
  countUpcomingBookings,
  findMembershipRecordsForExport,
  findAttendanceRecordsForExport,
  findPaymentRecordsForExport,
  findBookingRecordsForExport,
  findTrainerRecordsForExport,
  createExportAuditLog,
};