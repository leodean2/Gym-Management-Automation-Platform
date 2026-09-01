const notificationsService = require('./notifications.service');
const { ok } = require('../../lib/apiResponse');

// Feature 11 — Notifications
// Thin by design: no Prisma, no permission checks, no business rules.
// No createNotification controller function exists — BR-11.1:
// notifications are system-generated only, there is no
// POST /notifications endpoint.

async function listNotifications(req, res) {
  const result = await notificationsService.listNotifications(req.query, req.user);
  return ok(res, result);
}

async function getNotification(req, res) {
  const result = await notificationsService.getNotification(req.params.id, req.user);
  return ok(res, result);
}

async function markAsRead(req, res) {
  await notificationsService.markAsRead(req.params.id, req.user);
  return ok(res, { message: 'Notification marked as read.' });
}

async function resendNotification(req, res) {
  await notificationsService.resendNotification(req.params.id);
  return ok(res, { message: 'Notification queued for resend.' });
}

async function getAttempts(req, res) {
  const result = await notificationsService.getAttempts(req.params.id);
  return ok(res, result);
}

module.exports = {
  listNotifications,
  getNotification,
  markAsRead,
  resendNotification,
  getAttempts,
};