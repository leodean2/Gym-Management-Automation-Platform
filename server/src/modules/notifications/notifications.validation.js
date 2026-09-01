const { z } = require('zod');

// Feature 11 — Notifications
// Zod schemas for this module's request bodies/queries. No create schema
// exists at all — BR-11.1: notifications are system-generated only,
// there is no POST /notifications endpoint.

// Matches the frozen 15-value NotificationType enum exactly.
const NOTIFICATION_TYPE = z.enum([
  'PasswordReset',
  'PasswordChanged',
  'StaffAccountIssued',
  'MemberWelcome',
  'MembershipActivated',
  'MembershipRenewed',
  'MembershipExpiryReminder',
  'MembershipExpired',
  'PaymentConfirmation',
  'ReceiptGenerated',
  'BookingConfirmation',
  'BookingReminder',
  'BookingCancelled',
  'BookingRescheduled',
  'InquirySubmitted',
]);

// Matches the corrected NotificationStatus enum (Pending/Sent/Failed/
// Read) — see the documented schema-correction decision adding Read.
const NOTIFICATION_STATUS = z.enum(['Pending', 'Sent', 'Failed', 'Read']);

// GET /notifications — recipient_user_id/notification_type/status are
// all optional filters per the frozen Validation Rules ("List: Optional
// filters"). recipient_user_id is accepted here at the schema level, but
// the service overrides/ignores it for Member and Trainer requesters —
// same "client can't ask for someone else's data via query string"
// pattern applied to member_id/trainer_id in Features 7 and 10.
// Pagination is required per the frozen design, so page/limit use
// .default() rather than being fully optional.
const listNotificationsQuerySchema = z
  .object({
    recipient_user_id: z.string().uuid().optional(),
    notification_type: NOTIFICATION_TYPE.optional(),
    status: NOTIFICATION_STATUS.optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

// PATCH /:id/read — no body fields at all; marking read is a pure state
// transition (and idempotent per BR-11.5), same shape as Feature 7's
// finalizeWorkoutSessionSchema and Feature 10's completeBookingSchema.
const markReadSchema = z.object({}).strict();

// POST /:id/resend — the frozen design's response example shows no
// request body, and BR-11.6 gives the service everything it needs
// (notification_id from the URL, attempt_number computed server-side) —
// nothing for a client to supply.
const resendNotificationSchema = z.object({}).strict();

module.exports = {
  listNotificationsQuerySchema,
  markReadSchema,
  resendNotificationSchema,
};