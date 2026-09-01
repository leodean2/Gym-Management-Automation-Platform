const notificationsRepository = require('./notifications.repository');
const AppError = require('../../lib/AppError');

// Feature 11 — Notifications
// All business rules for this module live here. Keep this layer
// framework-agnostic — no req/res here.
//
// Notifications are scoped by recipient user account. Unlike Workout/
// Booking modules, Trainer visibility is NOT based on assigned members.
// Trainers and Members only see notifications where
// recipient_user_id === req.user.id. There is no lookup through
// current_trainer_id, member_id, or any assignment relationship —
// notifications are personal inbox items addressed to a user account,
// not to a member/trainer relationship.

// --- View --------------------------------------------------------------

/**
 * "Members only see their own notifications. Trainers only see their
 * own notifications. Staff may filter any user's notifications." —
 * for Member/Trainer, recipient_user_id is forced to the requester's own
 * id, ignoring anything supplied in the query string. Staff (GymOwner,
 * SuperAdmin, Receptionist) use recipient_user_id as an optional filter,
 * exactly as given.
 */
async function listNotifications(query, requester) {
  let scoped = {
    recipient_user_id: query.recipient_user_id,
    notification_type: query.notification_type,
    status: query.status,
  };

  if (requester.role === 'Member' || requester.role === 'Trainer') {
    scoped.recipient_user_id = requester.id;
  }

  const where = notificationsRepository.buildNotificationWhere(scoped);
  const skip = (query.page - 1) * query.limit;
  const { items, total } = await notificationsRepository.findNotifications({
    where,
    skip,
    take: query.limit,
  });

  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, total_pages: Math.ceil(total / query.limit) },
  };
}

/**
 * "Member/Trainer may only retrieve their own notification. Staff may
 * retrieve any notification."
 */
async function getNotification(notificationId, requester) {
  const notification = await notificationsRepository.findNotificationById(notificationId);
  if (!notification) {
    throw AppError.notFound('Notification not found');
  }

  if (['GymOwner', 'SuperAdmin', 'Receptionist'].includes(requester.role)) {
    return notification;
  }
  if (notification.recipient_user_id === requester.id) {
    return notification;
  }

  throw AppError.forbidden('You do not have permission to view this notification');
}

// --- Mark Read (BR-11.5) -----------------------------------------------

/**
 * "recipient must match current user unless staff" / "already-read
 * notifications return success (idempotent)" — an already-Read
 * notification is returned as-is, with no write, rather than erroring or
 * updating read_at to a new timestamp.
 */
async function markAsRead(notificationId, requester) {
  const notification = await notificationsRepository.findNotificationById(notificationId);
  if (!notification) {
    throw AppError.notFound('Notification not found');
  }

  const isStaff = ['GymOwner', 'SuperAdmin', 'Receptionist'].includes(requester.role);
  if (!isStaff && notification.recipient_user_id !== requester.id) {
    throw AppError.forbidden('You may only mark your own notifications as read');
  }

  if (notification.status === 'Read') {
    return notification;
  }

  return notificationsRepository.markAsRead(notificationId);
}

// --- Manual Resend (BR-11.6) --------------------------------------------

/**
 * "notification must exist / recipient_user_id must not be null / only
 * failed or pending notifications may be resent" — Sent and Read
 * notifications are not resendable; attempt_number is computed
 * server-side as one past whatever the highest existing attempt is,
 * never client-supplied, to respect the
 * @@unique([notification_id, attempt_number]) constraint safely.
 *
 * Feature 11 is notification MANAGEMENT, not notification TRANSPORT —
 * its responsibilities stop at recording that a resend was requested and
 * creating the NotificationAttempt audit row. Actual delivery (SMTP,
 * SendGrid, SES, Twilio, FCM, a background retry worker) belongs to a
 * future delivery service this codebase hasn't introduced yet; see the
 * TODO below for the exact seam that integration will plug into.
 */
async function resendNotification(notificationId) {
  const notification = await notificationsRepository.findNotificationById(notificationId);
  if (!notification) {
    throw AppError.notFound('Notification not found');
  }
  if (notification.recipient_user_id === null) {
    throw AppError.conflict(
      'NO_RECIPIENT',
      'This notification has no recipient user and cannot be resent'
    );
  }
  if (!['Pending', 'Failed'].includes(notification.status)) {
    throw AppError.conflict(
      'NOTIFICATION_NOT_RESENDABLE',
      `A notification with status ${notification.status} cannot be resent`
    );
  }

  const latestAttempt = await notificationsRepository.findLatestAttempt(notificationId);
  const nextAttemptNumber = latestAttempt ? latestAttempt.attempt_number + 1 : 1;

  const attempt = await notificationsRepository.createAttempt({
    notification_id: notificationId,
    attempt_number: nextAttemptNumber,
    status: 'Queued',
    attempted_at: new Date(),
  });

  // TODO: Integrate with the notification delivery provider
  // (email/SMS/push). This feature currently records resend attempts
  // only. Actual delivery is handled by a future notification delivery
  // service, e.g.:
  //   await notificationDeliveryService.enqueue({
  //     notificationId: notification.id,
  //     attemptId: attempt.id,
  //   });
  // Adding that call is a self-contained change here — no controller,
  // validation, or routing logic needs to change when it's introduced.

  return attempt;
}

// --- Attempt History -------------------------------------------------------

async function getAttempts(notificationId) {
  const notification = await notificationsRepository.findNotificationById(notificationId);
  if (!notification) {
    throw AppError.notFound('Notification not found');
  }
  return notificationsRepository.findAttemptsByNotification(notificationId);
}

module.exports = {
  listNotifications,
  getNotification,
  markAsRead,
  resendNotification,
  getAttempts,
};