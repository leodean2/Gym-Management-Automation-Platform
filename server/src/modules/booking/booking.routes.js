const express = require('express');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const bookingController = require('./booking.controller');
const {
  createAvailabilitySchema,
  listAvailabilityQuerySchema,
  createBookingSchema,
  listBookingsQuerySchema,
  rescheduleBookingSchema,
  completeBookingSchema,
  cancelBookingSchema,
  noShowBookingSchema,
  reopenBookingSchema,
} = require('./booking.validation');
const {
  AVAILABILITY_CREATE_ROLES,
  AVAILABILITY_VIEW_ROLES,
  AVAILABILITY_DELETE_ROLES,
  BOOKING_CREATE_ROLES,
  BOOKING_VIEW_ROLES,
  BOOKING_RESCHEDULE_ROLES,
  BOOKING_COMPLETE_ROLES,
  BOOKING_CANCEL_ROLES,
  BOOKING_NO_SHOW_ROLES,
  BOOKING_REOPEN_ROLES,
  RESCHEDULE_HISTORY_VIEW_ROLES,
  REOPEN_HISTORY_VIEW_ROLES,
} = require('./booking.constants');

// Feature 10 — Booking & Scheduling
//
// This module owns two distinct URL prefixes (/trainer-availability and
// /bookings), so it exports two routers — see app.js for how each is
// mounted.

// --- /api/v1/trainer-availability --------------------------------------------
const availabilityRouter = express.Router();

availabilityRouter.post(
  '/',
  authenticate,
  authorize(...AVAILABILITY_CREATE_ROLES),
  validate(createAvailabilitySchema),
  asyncHandler(bookingController.createAvailability)
);

availabilityRouter.get(
  '/',
  authenticate,
  authorize(...AVAILABILITY_VIEW_ROLES),
  validate(listAvailabilityQuerySchema, 'query'),
  asyncHandler(bookingController.listAvailability)
);

availabilityRouter.delete(
  '/:id',
  authenticate,
  authorize(...AVAILABILITY_DELETE_ROLES),
  asyncHandler(bookingController.deleteAvailability)
);

// --- /api/v1/bookings ----------------------------------------------------
const bookingsRouter = express.Router();

bookingsRouter.post(
  '/',
  authenticate,
  authorize(...BOOKING_CREATE_ROLES),
  validate(createBookingSchema),
  asyncHandler(bookingController.createBooking)
);

bookingsRouter.get(
  '/',
  authenticate,
  authorize(...BOOKING_VIEW_ROLES),
  validate(listBookingsQuerySchema, 'query'),
  asyncHandler(bookingController.listBookings)
);

bookingsRouter.get(
  '/:id',
  authenticate,
  authorize(...BOOKING_VIEW_ROLES),
  asyncHandler(bookingController.getBooking)
);

bookingsRouter.patch(
  '/:id/reschedule',
  authenticate,
  authorize(...BOOKING_RESCHEDULE_ROLES),
  validate(rescheduleBookingSchema),
  asyncHandler(bookingController.rescheduleBooking)
);

bookingsRouter.patch(
  '/:id/complete',
  authenticate,
  authorize(...BOOKING_COMPLETE_ROLES),
  validate(completeBookingSchema),
  asyncHandler(bookingController.completeBooking)
);

bookingsRouter.patch(
  '/:id/cancel',
  authenticate,
  authorize(...BOOKING_CANCEL_ROLES),
  validate(cancelBookingSchema),
  asyncHandler(bookingController.cancelBooking)
);

bookingsRouter.patch(
  '/:id/no-show',
  authenticate,
  authorize(...BOOKING_NO_SHOW_ROLES),
  validate(noShowBookingSchema),
  asyncHandler(bookingController.markNoShow)
);

bookingsRouter.patch(
  '/:id/reopen',
  authenticate,
  authorize(...BOOKING_REOPEN_ROLES),
  validate(reopenBookingSchema),
  asyncHandler(bookingController.reopenBooking)
);

// --- Booking History (nested under /bookings/:id) ---------------------------

bookingsRouter.get(
  '/:id/reschedule-history',
  authenticate,
  authorize(...RESCHEDULE_HISTORY_VIEW_ROLES),
  asyncHandler(bookingController.getRescheduleHistory)
);

bookingsRouter.get(
  '/:id/reopen-history',
  authenticate,
  authorize(...REOPEN_HISTORY_VIEW_ROLES),
  asyncHandler(bookingController.getReopenHistory)
);

module.exports = { availabilityRouter, bookingsRouter };