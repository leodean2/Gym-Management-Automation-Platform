const analyticsRepository = require('./analytics.repository');
const AppError = require('../../lib/AppError');

// Feature 12 — Admin Analytics Dashboard
// All business logic for this module lives here — mostly range
// resolution and assembling repository results into the documented
// response shapes. No authorization checks appear in most functions
// below: every KPI endpoint's role gate is the SAME two-role set
// (GymOwner/SuperAdmin) enforced entirely at the route level via
// authorize(), with no per-request scoping (no "your own" data concept
// anywhere in this module) — unlike Notifications/Bookings, there's
// nothing left for the service to check beyond what authorize() already
// gated. Only getOperationalDashboard and exportReport have anything
// service-level worth noting, called out at each function.

// --- Range resolution (FR-12.6) ---------------------------------------------

/**
 * Resolves the "today | week | month | custom" quick-filter into a
 * concrete {from, to} Date pair. week/month are calendar-aligned (start
 * of week = Monday, start of month = the 1st), running through the
 * current moment — not a trailing 7/30-day window — matching how the
 * doc's dashboard example range ("2026-08-01" to "2026-08-31") reads as
 * a full calendar month, not an arbitrary lookback.
 */
function resolveRange(query) {
  if (query.range === 'custom') {
    return { from: query.from, to: query.to };
  }

  const now = new Date();
  const to = now;
  let from;

  if (query.range === 'today') {
    from = new Date(now);
    from.setHours(0, 0, 0, 0);
  } else if (query.range === 'week') {
    from = new Date(now);
    const dayOfWeek = from.getDay(); // 0 = Sunday
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    from.setDate(from.getDate() - diffToMonday);
    from.setHours(0, 0, 0, 0);
  } else if (query.range === 'month') {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return { from, to };
}

function formatRange({ from, to }) {
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

// --- 1. Dashboard Summary ---------------------------------------------------

async function getDashboardSummary(query) {
  const range = resolveRange(query);

  const [membership, attendance, financial, trainers, bookings] = await Promise.all([
    buildMembershipAnalytics(range),
    buildAttendanceAnalytics(range),
    buildFinancialSummaryForDashboard(range),
    buildTrainerSummaryForDashboard(range),
    buildBookingAnalytics(range),
  ]);

  return {
    range: formatRange(range),
    membership,
    attendance,
    financial,
    trainers,
    bookings,
  };
}

// --- 2. Membership Analytics -------------------------------------------------

async function buildMembershipAnalytics(range) {
  const sevenDaysOut = new Date();
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    total_registered_members,
    active_memberships,
    pending_memberships,
    expired_memberships,
    cancelled_memberships,
    expiring_within_7_days,
    new_registrations_in_range,
  ] = await Promise.all([
    analyticsRepository.countTotalRegisteredMembers(),
    analyticsRepository.countMembershipsByStatus('Active'),
    analyticsRepository.countMembershipsByStatus('Pending'),
    analyticsRepository.countMembershipsByStatus('Expired'),
    analyticsRepository.countMembershipsByStatus('Cancelled'),
    analyticsRepository.countMembershipsExpiringWithin({ from: today, to: sevenDaysOut }),
    analyticsRepository.countNewRegistrations(range),
  ]);

  return {
    total_registered_members,
    active_memberships,
    pending_memberships,
    expired_memberships,
    cancelled_memberships,
    expiring_within_7_days,
    new_registrations_in_range,
  };
}

async function getMembershipAnalytics(query) {
  const range = resolveRange(query);
  const analytics = await buildMembershipAnalytics(range);
  return { range: formatRange(range), ...analytics };
}

// --- 3. Attendance Analytics -------------------------------------------------

async function buildAttendanceAnalytics(range) {
  const [total_check_ins, unique_members_checked_in] = await Promise.all([
    analyticsRepository.countAttendance(range),
    analyticsRepository.countUniqueMembersCheckedIn(range),
  ]);

  const dayCount = Math.max(
    1,
    Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  return {
    total_check_ins,
    unique_members_checked_in,
    average_daily_attendance: Math.round((total_check_ins / dayCount) * 10) / 10,
  };
}

async function getAttendanceAnalytics(query) {
  const range = resolveRange(query);
  const analytics = await buildAttendanceAnalytics(range);
  return { range: formatRange(range), ...analytics };
}

// --- 4. Financial Analytics -------------------------------------------------

async function buildFinancialSummaryForDashboard(range) {
  const todayRange = resolveRange({ range: 'today' });
  const monthRange = resolveRange({ range: 'month' });

  const [
    revenue_today,
    revenue_this_month,
    revenue_selected_range,
    outstanding,
    overdue,
  ] = await Promise.all([
    analyticsRepository.sumRevenue(todayRange),
    analyticsRepository.sumRevenue(monthRange),
    analyticsRepository.sumRevenue(range),
    analyticsRepository.getInvoiceSummaryByStatus('Pending'),
    analyticsRepository.getInvoiceSummaryByStatus('Overdue'),
  ]);

  return {
    revenue_today,
    revenue_this_month,
    revenue_selected_range,
    outstanding_invoices: outstanding.count,
    overdue_invoices: overdue.count,
  };
}

async function getFinancialAnalytics(query) {
  const range = resolveRange(query);

  const [revenue, revenue_by_payment_method, outstanding_invoices, overdue_invoices] = await Promise.all([
    analyticsRepository.sumRevenue(range),
    analyticsRepository.sumRevenueByPaymentMethod(range),
    analyticsRepository.getInvoiceSummaryByStatus('Pending'),
    analyticsRepository.getInvoiceSummaryByStatus('Overdue'),
  ]);

  return {
    range: formatRange(range),
    revenue,
    revenue_by_payment_method,
    outstanding_invoices,
    overdue_invoices,
  };
}

// --- 5. Trainer Analytics -------------------------------------------------

async function buildTrainerSummaryForDashboard(range) {
  const todayRange = resolveRange({ range: 'today' });

  const [active_trainers, bookings_today, completed_bookings_today] = await Promise.all([
    analyticsRepository.countActiveTrainers(),
    analyticsRepository.countBookingsInRange(todayRange),
    analyticsRepository.countBookingsByStatus(todayRange, 'Completed'),
  ]);

  return { active_trainers, bookings_today, completed_bookings_today };
}

async function getTrainerAnalytics(query) {
  const range = resolveRange(query);

  const [active_trainers, workload] = await Promise.all([
    analyticsRepository.countActiveTrainers(),
    analyticsRepository.getTrainerWorkload(range),
  ]);

  return { range: formatRange(range), active_trainers, workload };
}

// --- 6. Booking Analytics -------------------------------------------------

async function buildBookingAnalytics(range) {
  const [today, upcoming, completed, cancelled, no_show] = await Promise.all([
    analyticsRepository.countBookingsInRange(resolveRange({ range: 'today' })),
    analyticsRepository.countUpcomingBookings(),
    analyticsRepository.countBookingsByStatus(range, 'Completed'),
    analyticsRepository.countBookingsByStatus(range, 'Cancelled'),
    analyticsRepository.countBookingsByStatus(range, 'NoShow'),
  ]);

  return { today, upcoming, completed, cancelled, no_show };
}

async function getBookingAnalytics(query) {
  const range = resolveRange(query);

  const [total_bookings, completed, cancelled, no_show, upcoming] = await Promise.all([
    analyticsRepository.countBookingsInRange(range),
    analyticsRepository.countBookingsByStatus(range, 'Completed'),
    analyticsRepository.countBookingsByStatus(range, 'Cancelled'),
    analyticsRepository.countBookingsByStatus(range, 'NoShow'),
    analyticsRepository.countUpcomingBookings(),
  ]);

  return { range: formatRange(range), total_bookings, completed, cancelled, no_show, upcoming };
}

// --- 7. Operational Dashboard (Receptionist) --------------------------------

/**
 * Deliberately ignores whatever range query the client sent — FR-12.7:
 * this endpoint's figures are always "as of right now," not
 * range-scoped. resolveRange is never called here at all.
 */
async function getOperationalDashboard() {
  const today = resolveRange({ range: 'today' });
  const sevenDaysOut = new Date();
  sevenDaysOut.setHours(0, 0, 0, 0);
  const tomorrow = new Date(sevenDaysOut);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    todays_attendance,
    todays_bookings,
    upcoming_bookings,
    pending_memberships,
    memberships_expiring_today,
    outstanding,
  ] = await Promise.all([
    analyticsRepository.countAttendance(today),
    analyticsRepository.countBookingsInRange(today),
    analyticsRepository.countUpcomingBookings(),
    analyticsRepository.countMembershipsByStatus('Pending'),
    analyticsRepository.countMembershipsExpiringWithin({ from: sevenDaysOut, to: tomorrow }),
    analyticsRepository.getInvoiceSummaryByStatus('Pending'),
  ]);

  return {
    todays_attendance,
    todays_bookings,
    upcoming_bookings,
    pending_memberships,
    memberships_expiring_today,
    outstanding_invoices_requiring_followup: outstanding.count,
  };
}

// --- 8. Export CSV Report ---------------------------------------------------

const EXPORT_FETCHERS = {
  memberships: analyticsRepository.findMembershipRecordsForExport,
  attendance: analyticsRepository.findAttendanceRecordsForExport,
  financial: analyticsRepository.findPaymentRecordsForExport,
  trainers: analyticsRepository.findTrainerRecordsForExport,
  bookings: analyticsRepository.findBookingRecordsForExport,
};

/**
 * BR-12.1: the ONLY write this entire module performs, and it's an
 * AuditLog entry, never operational data — no Membership/Attendance/
 * Booking/etc. row is ever touched by this function. Returns the raw
 * records (not a formatted CSV string); CSV serialization is the
 * controller's job, matching how every other controller in this
 * codebase only shapes the response, never generates business data.
 */
async function exportReport(input, actingUser) {
  const range = resolveRange(input);
  const fetchRecords = EXPORT_FETCHERS[input.report];
  const records = await fetchRecords(range);

  // BR-12.5: only this metadata persists — the CSV file itself is never
  // stored, to avoid a second copy of sensitive data at rest.
  await analyticsRepository.createExportAuditLog({
    user_id: actingUser.id,
    event_type: 'CsvExportGenerated',
    action: `Exported ${input.report} report`,
    outcome: 'Success',
    occurred_at: new Date(),
    details: {
      report: input.report,
      range: formatRange(range),
      record_count: records.length,
    },
  });

  return { report: input.report, range: formatRange(range), records };
}

module.exports = {
  getDashboardSummary,
  getMembershipAnalytics,
  getAttendanceAnalytics,
  getFinancialAnalytics,
  getTrainerAnalytics,
  getBookingAnalytics,
  getOperationalDashboard,
  exportReport,
};