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

/**
 * @openapi
 * tags:
 *   name: Booking
 *   description: Trainer Availability and Bookings
 */

const availabilityRouter = express.Router();

/**
 * @openapi
 * /trainer-availability:
 *   post:
 *     tags: [Booking]
 *     summary: Create a Trainer Availability slot
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [trainer_id, availability_date, start_time, end_time]
 *             properties:
 *               trainer_id: { type: string, format: uuid }
 *               availability_date: { type: string, format: date }
 *               start_time: { type: string, example: "09:00" }
 *               end_time: { type: string, example: "17:00" }
 *     responses:
 *       201:
 *         description: Availability created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     message: { type: string }
 *                     data:
 *                       type: object
 *                       properties:
 *                         id: { type: string, format: uuid }
 *                         status: { type: string, example: Available }
 *       403: { description: Role not permitted (AVAILABILITY_CREATE_ROLES only) }
 */
availabilityRouter.post(
  '/',
  authenticate,
  authorize(...AVAILABILITY_CREATE_ROLES),
  validate(createAvailabilitySchema),
  asyncHandler(bookingController.createAvailability)
);

/**
 * @openapi
 * /trainer-availability:
 *   get:
 *     tags: [Booking]
 *     summary: List Trainer Availability slots
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: trainer_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: availability_date
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Paginated list }
 */
availabilityRouter.get(
  '/',
  authenticate,
  authorize(...AVAILABILITY_VIEW_ROLES),
  validate(listAvailabilityQuerySchema, 'query'),
  asyncHandler(bookingController.listAvailability)
);

/**
 * @openapi
 * /trainer-availability/{id}:
 *   delete:
 *     tags: [Booking]
 *     summary: Remove an unused Availability slot
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Availability removed }
 *       409: { description: Slot has bookings against it }
 */
availabilityRouter.delete(
  '/:id',
  authenticate,
  authorize(...AVAILABILITY_DELETE_ROLES),
  asyncHandler(bookingController.deleteAvailability)
);

// --- /api/v1/bookings ----------------------------------------------------
const bookingsRouter = express.Router();

/**
 * @openapi
 * /bookings:
 *   post:
 *     tags: [Booking]
 *     summary: Create a Booking
 *     description: >
 *       trainer_availability_id is derived server-side by finding a
 *       covering Available slot — never client-supplied. Rejects on
 *       member-side overlap, trainer-side overlap, or no covering
 *       availability. A Member may only book for themselves.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [member_id, trainer_id, booking_date, start_time, end_time]
 *             properties:
 *               member_id: { type: string, format: uuid }
 *               trainer_id: { type: string, format: uuid }
 *               booking_date: { type: string, format: date }
 *               start_time: { type: string, example: "10:00" }
 *               end_time: { type: string, example: "11:00" }
 *     responses:
 *       201:
 *         description: Booking created, status Scheduled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     message: { type: string }
 *                     data:
 *                       type: object
 *                       properties:
 *                         id: { type: string, format: uuid }
 *                         status: { type: string, example: Scheduled }
 *                         trainer_availability_id: { type: string, format: uuid }
 *       409:
 *         description: MEMBER_ALREADY_BOOKED, TRAINER_ALREADY_BOOKED, or NO_COVERING_AVAILABILITY
 */
bookingsRouter.post(
  '/',
  authenticate,
  authorize(...BOOKING_CREATE_ROLES),
  validate(createBookingSchema),
  asyncHandler(bookingController.createBooking)
);

/**
 * @openapi
 * /bookings:
 *   get:
 *     tags: [Booking]
 *     summary: List Bookings
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: member_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: trainer_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Scheduled, Completed, Cancelled, NoShow] }
 *       - in: query
 *         name: booking_date
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Paginated list, scoped to requester's role }
 */
bookingsRouter.get(
  '/',
  authenticate,
  authorize(...BOOKING_VIEW_ROLES),
  validate(listBookingsQuerySchema, 'query'),
  asyncHandler(bookingController.listBookings)
);

/**
 * @openapi
 * /bookings/{id}:
 *   get:
 *     tags: [Booking]
 *     summary: Get a Booking
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Booking detail }
 */
bookingsRouter.get(
  '/:id',
  authenticate,
  authorize(...BOOKING_VIEW_ROLES),
  asyncHandler(bookingController.getBooking)
);

/**
 * @openapi
 * /bookings/{id}/reschedule:
 *   patch:
 *     tags: [Booking]
 *     summary: Reschedule a Booking
 *     description: Mutates the same row; old values preserved in BookingRescheduleHistory. Receptionist-only.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [booking_date, start_time, end_time, reason]
 *             properties:
 *               booking_date: { type: string, format: date }
 *               start_time: { type: string }
 *               end_time: { type: string }
 *               reason: { type: string }
 *     responses:
 *       200: { description: Rescheduled booking }
 *       409: { description: Booking is not Scheduled, or new slot unavailable/overlapping }
 */
bookingsRouter.patch(
  '/:id/reschedule',
  authenticate,
  authorize(...BOOKING_RESCHEDULE_ROLES),
  validate(rescheduleBookingSchema),
  asyncHandler(bookingController.rescheduleBooking)
);

/**
 * @openapi
 * /bookings/{id}/complete:
 *   patch:
 *     tags: [Booking]
 *     summary: Mark a Booking Completed
 *     description: Trainer-only, and only their own booking.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Booking marked Completed }
 *       409: { description: Booking is not Scheduled }
 */
bookingsRouter.patch(
  '/:id/complete',
  authenticate,
  authorize(...BOOKING_COMPLETE_ROLES),
  validate(completeBookingSchema),
  asyncHandler(bookingController.completeBooking)
);

/**
 * @openapi
 * /bookings/{id}/cancel:
 *   patch:
 *     tags: [Booking]
 *     summary: Cancel a Booking
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200: { description: Booking marked Cancelled }
 */
bookingsRouter.patch(
  '/:id/cancel',
  authenticate,
  authorize(...BOOKING_CANCEL_ROLES),
  validate(cancelBookingSchema),
  asyncHandler(bookingController.cancelBooking)
);

/**
 * @openapi
 * /bookings/{id}/no-show:
 *   patch:
 *     tags: [Booking]
 *     summary: Mark a Booking as NoShow
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string, description: Optional }
 *     responses:
 *       200: { description: Booking marked NoShow }
 */
bookingsRouter.patch(
  '/:id/no-show',
  authenticate,
  authorize(...BOOKING_NO_SHOW_ROLES),
  validate(noShowBookingSchema),
  asyncHandler(bookingController.markNoShow)
);

/**
 * @openapi
 * /bookings/{id}/reopen:
 *   patch:
 *     tags: [Booking]
 *     summary: Reopen a Completed/Cancelled/NoShow Booking back to Scheduled
 *     description: Records a BookingReopenHistory row with the previous status. GymOwner/SuperAdmin only.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200: { description: Booking reopened, status Scheduled }
 *       409: { description: Booking status is not Completed/Cancelled/NoShow }
 */
bookingsRouter.patch(
  '/:id/reopen',
  authenticate,
  authorize(...BOOKING_REOPEN_ROLES),
  validate(reopenBookingSchema),
  asyncHandler(bookingController.reopenBooking)
);

// --- Booking History (nested under /bookings/:id) ---------------------------

/**
 * @openapi
 * /bookings/{id}/reschedule-history:
 *   get:
 *     tags: [Booking]
 *     summary: Get a Booking's reschedule history
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Array of BookingRescheduleHistory rows }
 */
bookingsRouter.get(
  '/:id/reschedule-history',
  authenticate,
  authorize(...RESCHEDULE_HISTORY_VIEW_ROLES),
  asyncHandler(bookingController.getRescheduleHistory)
);

/**
 * @openapi
 * /bookings/{id}/reopen-history:
 *   get:
 *     tags: [Booking]
 *     summary: Get a Booking's reopen history
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Array of BookingReopenHistory rows }
 */
bookingsRouter.get(
  '/:id/reopen-history',
  authenticate,
  authorize(...REOPEN_HISTORY_VIEW_ROLES),
  asyncHandler(bookingController.getReopenHistory)
);

module.exports = { availabilityRouter, bookingsRouter };