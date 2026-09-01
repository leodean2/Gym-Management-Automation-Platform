const bookingRepository = require('./booking.repository');
const AppError = require('../../lib/AppError');

// Feature 10 — Booking & Scheduling
// All business rules for this module live here. Keep this layer
// framework-agnostic — no req/res here.

// --- Time helpers ---------------------------------------------------------

/**
 * Combines a calendar date with an "HH:mm" string into a single Date
 * object, matching how Prisma expects @db.Time(6) values to be written.
 * The date portion is irrelevant for comparisons within a single day —
 * only used so Prisma has a valid full timestamp to store.
 */
function combineDateAndTime(date, timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}

// --- Trainer Availability ---------------------------------------------------

/**
 * "trainer must exist / trainer must be Active" per the frozen
 * Validation Rules — Active here refers to the Trainer's underlying
 * User.account_status, the same status field checked by the Inactive-
 * Trainer override pattern used throughout Workout Programs/Nutrition.
 */
async function createAvailability(input) {
  const trainer = await bookingRepository.findTrainerById(input.trainer_id);
  if (!trainer) {
    throw AppError.notFound('Trainer not found');
  }
  if (trainer.user.account_status !== 'Active') {
    throw AppError.conflict('TRAINER_INACTIVE', 'Cannot create availability for an inactive trainer');
  }

  const startTime = combineDateAndTime(input.availability_date, input.start_time);
  const endTime = combineDateAndTime(input.availability_date, input.end_time);

  return bookingRepository.createAvailability({
    trainer_id: input.trainer_id,
    availability_date: input.availability_date,
    start_time: startTime,
    end_time: endTime,
    status: 'Available',
  });
}

async function listAvailability(query) {
  const where = bookingRepository.buildAvailabilityWhere({
    trainer_id: query.trainer_id,
    availability_date: query.availability_date,
  });
  const skip = (query.page - 1) * query.limit;
  const { items, total } = await bookingRepository.findAvailabilityList({ where, skip, take: query.limit });

  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, total_pages: Math.ceil(total / query.limit) },
  };
}

/**
 * "Removes an unused availability slot" — rejects with 409 rather than
 * letting the FK's onDelete: Restrict surface a raw database error if
 * any Booking (of any status) still references this slot.
 */
async function deleteAvailability(availabilityId) {
  const availability = await bookingRepository.findAvailabilityById(availabilityId);
  if (!availability) {
    throw AppError.notFound('Availability slot not found');
  }

  const bookingCount = await bookingRepository.countBookingsForAvailability(availabilityId);
  if (bookingCount > 0) {
    throw AppError.conflict(
      'AVAILABILITY_IN_USE',
      'This availability slot has bookings against it and cannot be removed'
    );
  }

  return bookingRepository.deleteAvailability(availabilityId);
}

// --- Booking -----------------------------------------------------------

/**
 * "Member may only create bookings for themselves" — enforced here, not
 * at the route, since it depends on comparing the request body's
 * member_id against the authenticated requester's own Member record.
 * "trainer must be the member's current assigned trainer" per the
 * frozen Validation Rules.
 */
async function createBooking(input, actingUser) {
  if (actingUser.role === 'Member') {
    const requestingMember = await bookingRepository.findMemberById(input.member_id);
    if (!requestingMember || requestingMember.user_id !== actingUser.id) {
      throw AppError.forbidden('You may only create bookings for yourself');
    }
  }

  const trainer = await bookingRepository.findTrainerById(input.trainer_id);
  if (!trainer) {
    throw AppError.notFound('Trainer not found');
  }
  if (trainer.user.account_status !== 'Active') {
    throw AppError.conflict('TRAINER_INACTIVE', 'Cannot book an inactive trainer');
  }

  const member = await bookingRepository.findMemberById(input.member_id);
  if (!member) {
    throw AppError.notFound('Member not found');
  }
  if (member.current_trainer_id !== input.trainer_id) {
    throw AppError.forbidden('You may only book your currently assigned trainer');
  }

  const startTime = combineDateAndTime(input.booking_date, input.start_time);
  const endTime = combineDateAndTime(input.booking_date, input.end_time);

  // trainer must have availability covering the requested period.
  const coveringSlot = await bookingRepository.findCoveringAvailability({
    trainerId: input.trainer_id,
    date: input.booking_date,
    startTime,
    endTime,
  });
  if (!coveringSlot) {
    throw AppError.conflict(
      'NO_COVERING_AVAILABILITY',
      'This trainer has no availability covering the requested time period'
    );
  }

  // Member-side overlap: no database constraint exists for this (see
  // BR-10.5, trainer_id only) — application-layer check is the only
  // safeguard.
  const overlappingMemberBooking = await bookingRepository.findOverlappingMemberBooking({
    memberId: input.member_id,
    bookingDate: input.booking_date,
    startTime,
    endTime,
  });
  if (overlappingMemberBooking) {
    throw AppError.conflict(
      'MEMBER_ALREADY_BOOKED',
      'The member already has a scheduled booking during this time'
    );
  }

  // Trainer-side overlap: friendlier pre-check ahead of the database's
  // exclusion constraint, which remains the final safeguard against a
  // concurrent-request race.
  const overlappingTrainerBooking = await bookingRepository.findOverlappingTrainerBooking({
    trainerId: input.trainer_id,
    bookingDate: input.booking_date,
    startTime,
    endTime,
  });
  if (overlappingTrainerBooking) {
    throw AppError.conflict(
      'TRAINER_ALREADY_BOOKED',
      'The trainer already has a scheduled booking during this time'
    );
  }

  try {
    return await bookingRepository.createBooking({
      member_id: input.member_id,
      trainer_id: input.trainer_id,
      trainer_availability_id: coveringSlot.id,
      booking_date: input.booking_date,
      start_time: startTime,
      end_time: endTime,
      created_by: actingUser.id,
      status: 'Scheduled',
    });
  } catch (err) {
    // TODO: Verify Prisma's error shape for PostgreSQL EXCLUDE constraint
    // violations against the production Postgres + Prisma versions —
    // Prisma has no native notion of exclusion constraints, so there is
    // no guaranteed-stable error code equivalent to P2002 for this case.
    // Adjust the translation below if integration testing shows a
    // different shape. Concurrent-request race that slipped past the
    // pre-check above.
    if (err.code === 'P2010' || err.meta?.code === '23P01') {
      throw AppError.conflict(
        'TRAINER_ALREADY_BOOKED',
        'The trainer already has a scheduled booking during this time'
      );
    }
    throw err;
  }
}

// --- View --------------------------------------------------------------

async function getBooking(bookingId, requester) {
  const booking = await bookingRepository.findBookingById(bookingId);
  if (!booking) {
    throw AppError.notFound('Booking not found');
  }

  if (['GymOwner', 'SuperAdmin', 'Receptionist'].includes(requester.role)) {
    return booking;
  }
  if (requester.role === 'Member' && booking.member.user_id === requester.id) {
    return booking;
  }
  if (requester.role === 'Trainer' && booking.trainer.user_id === requester.id) {
    return booking;
  }

  throw AppError.forbidden('You do not have permission to view this booking');
}

/**
 * GymOwner/SuperAdmin/Receptionist: use query filters as supplied.
 * Member: member_id is derived from the requester's own Member record,
 * never trusted from the query string — the other filters (trainer_id,
 * status, booking_date) still apply on top, so a Member can e.g. filter
 * their own bookings by trainer. Trainer: trainer_id is derived the
 * same way, ignoring any trainer_id supplied in the query.
 */
async function listBookings(query, requester) {
  let scoped = {
    member_id: query.member_id,
    trainer_id: query.trainer_id,
    status: query.status,
    booking_date: query.booking_date,
  };

  if (requester.role === 'Member') {
    const member = await bookingRepository.findMemberByUserId(requester.id);
    if (!member) {
      throw AppError.forbidden();
    }
    scoped.member_id = member.id;
  } else if (requester.role === 'Trainer') {
    const trainer = await bookingRepository.findTrainerByUserId(requester.id);
    if (!trainer) {
      throw AppError.forbidden();
    }
    scoped.trainer_id = trainer.id;
  }

  const where = bookingRepository.buildBookingWhere(scoped);
  const skip = (query.page - 1) * query.limit;
  const { items, total } = await bookingRepository.findBookings({ where, skip, take: query.limit });

  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, total_pages: Math.ceil(total / query.limit) },
  };
}

// --- Reschedule (BR-10.3) -----------------------------------------------

/**
 * "booking must currently be Scheduled" / "new slot must be available" —
 * re-runs the same covering-availability and overlap checks createBooking
 * used, against the NEW proposed time, since a reschedule is really
 * "cancel this slot, book a new one" from a validation standpoint, just
 * without creating a second Booking row (BR-10.3: mutate in place).
 */
async function rescheduleBooking(bookingId, input, actingUser) {
  const booking = await bookingRepository.findBookingById(bookingId);
  if (!booking) {
    throw AppError.notFound('Booking not found');
  }
  if (booking.status !== 'Scheduled') {
    throw AppError.conflict(
      'BOOKING_NOT_SCHEDULED',
      `A booking with status ${booking.status} cannot be rescheduled`
    );
  }

  const newStartTime = combineDateAndTime(input.booking_date, input.start_time);
  const newEndTime = combineDateAndTime(input.booking_date, input.end_time);

  const coveringSlot = await bookingRepository.findCoveringAvailability({
    trainerId: booking.trainer_id,
    date: input.booking_date,
    startTime: newStartTime,
    endTime: newEndTime,
  });
  if (!coveringSlot) {
    throw AppError.conflict(
      'NO_COVERING_AVAILABILITY',
      'This trainer has no availability covering the requested time period'
    );
  }

  const overlappingMemberBooking = await bookingRepository.findOverlappingMemberBooking({
    memberId: booking.member_id,
    bookingDate: input.booking_date,
    startTime: newStartTime,
    endTime: newEndTime,
  });
  if (overlappingMemberBooking && overlappingMemberBooking.id !== bookingId) {
    throw AppError.conflict(
      'MEMBER_ALREADY_BOOKED',
      'The member already has a scheduled booking during this time'
    );
  }

  const overlappingTrainerBooking = await bookingRepository.findOverlappingTrainerBooking({
    trainerId: booking.trainer_id,
    bookingDate: input.booking_date,
    startTime: newStartTime,
    endTime: newEndTime,
  });
  if (overlappingTrainerBooking && overlappingTrainerBooking.id !== bookingId) {
    throw AppError.conflict(
      'TRAINER_ALREADY_BOOKED',
      'The trainer already has a scheduled booking during this time'
    );
  }

  const { booking: updated } = await bookingRepository.rescheduleBooking({
    bookingId,
    newValues: {
      booking_date: input.booking_date,
      start_time: newStartTime,
      end_time: newEndTime,
      trainer_availability_id: coveringSlot.id,
    },
    historyData: {
      booking_id: bookingId,
      previous_booking_date: booking.booking_date,
      previous_start_time: booking.start_time,
      previous_end_time: booking.end_time,
      new_booking_date: input.booking_date,
      new_start_time: newStartTime,
      new_end_time: newEndTime,
      rescheduled_by: actingUser.id,
      rescheduled_at: new Date(),
      reason: input.reason,
    },
  });

  return updated;
}

// --- Complete / Cancel / No Show --------------------------------------------

/**
 * "only Scheduled bookings / performed by Trainer" — scoped to the
 * booking's own trainer_id specifically, not "assigned to this member,"
 * since a booking's trainer is fixed at creation and doesn't drift the
 * way a member's current_trainer_id can.
 */
async function completeBooking(bookingId, actingUser) {
  const booking = await bookingRepository.findBookingById(bookingId);
  if (!booking) {
    throw AppError.notFound('Booking not found');
  }
  if (booking.status !== 'Scheduled') {
    throw AppError.conflict('BOOKING_NOT_SCHEDULED', `A booking with status ${booking.status} cannot be completed`);
  }
  if (booking.trainer.user_id !== actingUser.id) {
    throw AppError.forbidden('You may only complete your own bookings');
  }

  return bookingRepository.completeBooking(bookingId);
}

async function cancelBooking(bookingId, input) {
  const booking = await bookingRepository.findBookingById(bookingId);
  if (!booking) {
    throw AppError.notFound('Booking not found');
  }
  if (booking.status !== 'Scheduled') {
    throw AppError.conflict('BOOKING_NOT_SCHEDULED', `A booking with status ${booking.status} cannot be cancelled`);
  }

  return bookingRepository.cancelBooking(bookingId, input.reason);
}

async function markNoShow(bookingId) {
  const booking = await bookingRepository.findBookingById(bookingId);
  if (!booking) {
    throw AppError.notFound('Booking not found');
  }
  if (booking.status !== 'Scheduled') {
    throw AppError.conflict('BOOKING_NOT_SCHEDULED', `A booking with status ${booking.status} cannot be marked NoShow`);
  }

  return bookingRepository.markNoShow(bookingId);
}

// --- Reopen (BR-10.4) -----------------------------------------------------

/**
 * "only Completed / only Cancelled / only NoShow" — the booking's
 * CURRENT status becomes BookingReopenHistory.previous_status, captured
 * before the mutation, then the booking goes back to Scheduled.
 */
async function reopenBooking(bookingId, input, actingUser) {
  const booking = await bookingRepository.findBookingById(bookingId);
  if (!booking) {
    throw AppError.notFound('Booking not found');
  }
  if (!['Completed', 'Cancelled', 'NoShow'].includes(booking.status)) {
    throw AppError.conflict('BOOKING_NOT_REOPENABLE', `A booking with status ${booking.status} cannot be reopened`);
  }

  const { booking: reopened } = await bookingRepository.reopenBooking({
    bookingId,
    reopenedBy: actingUser.id,
    previousStatus: booking.status,
    reason: input.reason,
  });

  return reopened;
}

// --- Booking History -------------------------------------------------------

async function getRescheduleHistory(bookingId) {
  const booking = await bookingRepository.findBookingById(bookingId);
  if (!booking) {
    throw AppError.notFound('Booking not found');
  }
  return bookingRepository.findRescheduleHistory(bookingId);
}

async function getReopenHistory(bookingId) {
  const booking = await bookingRepository.findBookingById(bookingId);
  if (!booking) {
    throw AppError.notFound('Booking not found');
  }
  return bookingRepository.findReopenHistory(bookingId);
}

module.exports = {
  createAvailability,
  listAvailability,
  deleteAvailability,
  createBooking,
  getBooking,
  listBookings,
  rescheduleBooking,
  completeBooking,
  cancelBooking,
  markNoShow,
  reopenBooking,
  getRescheduleHistory,
  getReopenHistory,
};