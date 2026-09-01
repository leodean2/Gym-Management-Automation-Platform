const express = require('express');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const notificationsController = require('./notifications.controller');
const {
  listNotificationsQuerySchema,
  markReadSchema,
  resendNotificationSchema,
} = require('./notifications.validation');
const {
  VIEW_ROLES,
  MARK_READ_ROLES,
  RESEND_ROLES,
  ATTEMPTS_VIEW_ROLES,
} = require('./notifications.constants');

// Feature 11 — Notifications
//
// No POST / route exists at all — BR-11.1: notifications are generated
// automatically by their originating feature; clients never call a
// "create notification" endpoint. Single router, single URL prefix —
// unlike Nutrition/Workout Programs/Booking, this module has no nested
// sub-resource routes mounted elsewhere (e.g. under /members).

const router = express.Router();

/**
 * @openapi
 * tags:
 *   name: Notifications
 *   description: System-generated notifications (BR-11.1 — no create endpoint exists)
 */

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List Notifications
 *     description: Member/Trainer see only their own (recipient_user_id forced to requester); staff may filter any recipient.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: recipient_user_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: notification_type
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Pending, Sent, Failed, Read] }
 *     responses:
 *       200: { description: Paginated list }
 */
router.get(
  '/',
  authenticate,
  authorize(...VIEW_ROLES),
  validate(listNotificationsQuerySchema, 'query'),
  asyncHandler(notificationsController.listNotifications)
);

/**
 * @openapi
 * /notifications/{id}:
 *   get:
 *     tags: [Notifications]
 *     summary: Get a Notification
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Notification detail }
 *       403: { description: Not the recipient (Member/Trainer) }
 */
router.get(
  '/:id',
  authenticate,
  authorize(...VIEW_ROLES),
  asyncHandler(notificationsController.getNotification)
);

/**
 * @openapi
 * /notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark a Notification as read
 *     description: Idempotent — marking an already-Read notification returns success, not an error.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Notification marked as read }
 */
router.patch(
  '/:id/read',
  authenticate,
  authorize(...MARK_READ_ROLES),
  validate(markReadSchema),
  asyncHandler(notificationsController.markAsRead)
);

/**
 * @openapi
 * /notifications/{id}/resend:
 *   post:
 *     tags: [Notifications]
 *     summary: Manually resend a Notification
 *     description: >
 *       GymOwner/SuperAdmin only. Only Pending/Failed notifications may
 *       be resent. Creates a new NotificationAttempt row
 *       (attempt_number auto-incremented) — existing attempts are never
 *       modified. Actual delivery (email/SMS) is a future integration
 *       point; this endpoint only records the attempt.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Notification queued for resend }
 *       409: { description: NOTIFICATION_NOT_RESENDABLE (status is Sent or Read) }
 */
router.post(
  '/:id/resend',
  authenticate,
  authorize(...RESEND_ROLES),
  validate(resendNotificationSchema),
  asyncHandler(notificationsController.resendNotification)
);

/**
 * @openapi
 * /notifications/{id}/attempts:
 *   get:
 *     tags: [Notifications]
 *     summary: Get a Notification's delivery attempt history
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Array of NotificationAttempt rows, ordered by attempt_number }
 */
router.get(
  '/:id/attempts',
  authenticate,
  authorize(...ATTEMPTS_VIEW_ROLES),
  asyncHandler(notificationsController.getAttempts)
);

module.exports = router;