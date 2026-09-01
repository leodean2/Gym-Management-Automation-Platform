const bookingService = require('./booking.service');
const { ok, created } = require('../../lib/apiResponse');

// Feature 10 — Booking & Scheduling
// Thin by design: no Prisma, no permission checks, no business rules.

// --- Trainer Availability ---------------------------------------------------

async function createAvailability(req, res) {
  const result = await bookingService.createAvailability(req.body);
  return created(res, { message: 'Availability created successfully.', data: result });
}

async function listAvailability(req, res) {
  const result = await bookingService.listAvailability(req.query);
  return ok(res, result);
}

async function deleteAvailability(req, res) {
  await bookingService.deleteAvailability(req.params.id);
  return ok(res, { message: 'Availability removed successfully.' });
}

// --- Booking -----------------------------------------------------------

async function createBooking(req, res) {
  const result = await bookingService.createBooking(req.body, req.user);
  return created(res, { message: 'Booking created successfully.', data: result });
}

async function getBooking(req, res) {
  const result = await bookingService.getBooking(req.params.id, req.user);
  return ok(res, result);
}

async function listBookings(req, res) {
  const result = await bookingService.listBookings(req.query, req.user);
  return ok(res, result);
}

async function rescheduleBooking(req, res) {
  const result = await bookingService.rescheduleBooking(req.params.id, req.body, req.user);
  return ok(res, result);
}

async function completeBooking(req, res) {
  const result = await bookingService.completeBooking(req.params.id, req.user);
  return ok(res, result);
}

async function cancelBooking(req, res) {
  const result = await bookingService.cancelBooking(req.params.id, req.body);
  return ok(res, result);
}

async function markNoShow(req, res) {
  const result = await bookingService.markNoShow(req.params.id);
  return ok(res, result);
}

async function reopenBooking(req, res) {
  const result = await bookingService.reopenBooking(req.params.id, req.body, req.user);
  return ok(res, result);
}

// --- Booking History -------------------------------------------------------

async function getRescheduleHistory(req, res) {
  const result = await bookingService.getRescheduleHistory(req.params.id);
  return ok(res, result);
}

async function getReopenHistory(req, res) {
  const result = await bookingService.getReopenHistory(req.params.id);
  return ok(res, result);
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