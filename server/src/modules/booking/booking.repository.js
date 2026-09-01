const prisma = require('../../config/db');

/**
 * Booking repository — ONLY database access lives here. No authorization,
 * no business rules. Time fields are handled as full Date objects at
 * this layer (Prisma expects that for @db.Time(6) columns) — combining
 * an "HH:mm" string with a calendar date is the service's job, not the
 * repository's.
 */

// --- Helpers needed for authorization/validation in the service ------------

function findTrainerById(id) {
  return prisma.trainer.findUnique({ where: { id }, include: { user: { select: { account_status: true } } } });
}

function findMemberById(id) {
  return prisma.member.findUnique({ where: { id } });
}

function findTrainerByUserId(userId) {
  return prisma.trainer.findUnique({ where: { user_id: userId } });
}

function findMemberByUserId(userId) {
  return prisma.member.findUnique({ where: { user_id: userId } });
}

// --- Trainer Availability ---------------------------------------------------

function createAvailability(data) {
  return prisma.trainerAvailability.create({ data });
}

function findAvailabilityById(id) {
  return prisma.trainerAvailability.findUnique({ where: { id } });
}

function buildAvailabilityWhere({ trainer_id, availability_date }) {
  const where = {};
  const and = [];

  if (trainer_id) and.push({ trainer_id });
  if (availability_date) and.push({ availability_date });

  if (and.length > 0) where.AND = and;
  return where;
}

async function findAvailabilityList({ where, skip, take }) {
  const [items, total] = await Promise.all([
    prisma.trainerAvailability.findMany({
      where,
      skip,
      take,
      orderBy: [{ availability_date: 'asc' }, { start_time: 'asc' }],
    }),
    prisma.trainerAvailability.count({ where }),
  ]);

  return { items, total };
}

/**
 * Backs the create-booking derivation: "an Available slot for this
 * trainer, on this date, whose [start_time, end_time) fully contains the
 * requested interval." gte/lte on start_time/end_time is safe here since
 * Prisma stores @db.Time(6) values with a fixed reference date, so
 * comparisons behave as expected within a single availability_date.
 */
function findCoveringAvailability({ trainerId, date, startTime, endTime }) {
  return prisma.trainerAvailability.findFirst({
    where: {
      trainer_id: trainerId,
      availability_date: date,
      status: 'Available',
      start_time: { lte: startTime },
      end_time: { gte: endTime },
    },
  });
}

function deleteAvailability(id) {
  return prisma.trainerAvailability.delete({ where: { id } });
}

/**
 * "Removes an unused availability slot" — the service needs to confirm
 * no Booking references this slot before deleting (the FK is
 * onDelete: Restrict, so Postgres would reject it anyway, but this lets
 * the service return a clean 409 instead of surfacing a raw DB
 * constraint error).
 */
function countBookingsForAvailability(availabilityId) {
  return prisma.booking.count({ where: { trainer_availability_id: availabilityId } });
}

// --- Booking -----------------------------------------------------------

function createBooking(data) {
  return prisma.booking.create({ data });
}

function findBookingById(id) {
  return prisma.booking.findUnique({
    where: { id },
    include: {
      member: { select: { user_id: true, current_trainer_id: true } },
      trainer: { select: { user_id: true } },
    },
  });
}

function buildBookingWhere({ member_id, trainer_id, status, booking_date }) {
  const where = {};
  const and = [];

  if (member_id) and.push({ member_id });
  if (trainer_id) and.push({ trainer_id });
  if (status) and.push({ status });
  if (booking_date) and.push({ booking_date });

  if (and.length > 0) where.AND = and;
  return where;
}

async function findBookings({ where, skip, take }) {
  const [items, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take,
      orderBy: [{ booking_date: 'desc' }, { start_time: 'desc' }],
    }),
    prisma.booking.count({ where }),
  ]);

  return { items, total };
}

/**
 * Application-layer overlap check for the member side (no DB exclusion
 * constraint exists for member_id — see BR-10.5, which only covers
 * trainer_id). Two time ranges overlap when one starts before the other
 * ends, in both directions: existing.start < new.end AND existing.end >
 * new.start.
 */
function findOverlappingMemberBooking({ memberId, bookingDate, startTime, endTime }) {
  return prisma.booking.findFirst({
    where: {
      member_id: memberId,
      booking_date: bookingDate,
      status: 'Scheduled',
      start_time: { lt: endTime },
      end_time: { gt: startTime },
    },
  });
}

/**
 * Trainer-side equivalent, kept as an application-layer pre-check for a
 * friendlier error even though the database's exclusion constraint
 * (BR-10.5) is the actual final safeguard against a concurrent-request
 * race — this just lets the service reject early in the common case
 * instead of always falling through to a raw Postgres constraint error.
 */
function findOverlappingTrainerBooking({ trainerId, bookingDate, startTime, endTime }) {
  return prisma.booking.findFirst({
    where: {
      trainer_id: trainerId,
      booking_date: bookingDate,
      status: 'Scheduled',
      start_time: { lt: endTime },
      end_time: { gt: startTime },
    },
  });
}

/**
 * Reschedule mutates the existing Booking row in place (per BR-10.3) and
 * writes the pre-change values into BookingRescheduleHistory
 * atomically — the two must never happen independently, or history
 * would silently diverge from what actually changed.
 */
function rescheduleBooking({ bookingId, newValues, historyData }) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.update({
      where: { id: bookingId },
      data: newValues,
    });

    const history = await tx.bookingRescheduleHistory.create({ data: historyData });

    return { booking, history };
  });
}

function completeBooking(id) {
  return prisma.booking.update({ where: { id }, data: { status: 'Completed' } });
}

function cancelBooking(id, reason) {
  return prisma.booking.update({
    where: { id },
    data: { status: 'Cancelled', cancellation_reason: reason },
  });
}

function markNoShow(id) {
  return prisma.booking.update({ where: { id }, data: { status: 'NoShow' } });
}

/**
 * Reopen mutates the same Booking row back to Scheduled (per BR-10.4)
 * and writes a BookingReopenHistory row atomically, same reasoning as
 * rescheduleBooking above.
 */
function reopenBooking({ bookingId, reopenedBy, previousStatus, reason }) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.update({
      where: { id: bookingId },
      data: { status: 'Scheduled' },
    });

    const history = await tx.bookingReopenHistory.create({
      data: {
        booking_id: bookingId,
        previous_status: previousStatus,
        reopened_by: reopenedBy,
        reopened_at: new Date(),
        reason,
      },
    });

    return { booking, history };
  });
}

// --- Booking History -------------------------------------------------------

function findRescheduleHistory(bookingId) {
  return prisma.bookingRescheduleHistory.findMany({
    where: { booking_id: bookingId },
    orderBy: { rescheduled_at: 'desc' },
  });
}

function findReopenHistory(bookingId) {
  return prisma.bookingReopenHistory.findMany({
    where: { booking_id: bookingId },
    orderBy: { reopened_at: 'desc' },
  });
}

module.exports = {
  findTrainerById,
  findMemberById,
  findTrainerByUserId,
  findMemberByUserId,
  createAvailability,
  findAvailabilityById,
  buildAvailabilityWhere,
  findAvailabilityList,
  findCoveringAvailability,
  deleteAvailability,
  countBookingsForAvailability,
  createBooking,
  findBookingById,
  buildBookingWhere,
  findBookings,
  findOverlappingMemberBooking,
  findOverlappingTrainerBooking,
  rescheduleBooking,
  completeBooking,
  cancelBooking,
  markNoShow,
  reopenBooking,
  findRescheduleHistory,
  findReopenHistory,
};