const { z } = require('zod');

// Feature 10 — Booking & Scheduling
// Zod schemas for this module's request bodies/queries. Time fields are
// validated as "HH:mm" strings here — schema.prisma stores start_time/
// end_time as @db.Time(6) DateTime columns, but the request/response
// wire format matches the frozen design's examples ("09:00"), so the
// service is responsible for combining a date + time string into a full
// DateTime before handing it to Prisma.

const TIME_STRING = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be a valid 24-hour time in HH:mm format');

// --- Trainer Availability ---------------------------------------------------

// end_time > start_time and availability_date not in the past are both
// validation-layer checks per the frozen "Validation Rules" list — kept
// here rather than the service, consistent with how Zod's .refine() is
// used elsewhere for cross-field checks (e.g. Feature 8's from/to date
// range). "Trainer must exist / must be Active" are NOT here, since
// those require a database lookup — those stay in the service.
const createAvailabilitySchema = z
  .object({
    trainer_id: z.string().uuid(),
    availability_date: z.coerce.date(),
    start_time: TIME_STRING,
    end_time: TIME_STRING,
  })
  .strict()
  .refine((data) => data.end_time > data.start_time, {
    message: 'end_time must be after start_time',
    path: ['end_time'],
  })
  .refine(
    (data) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return data.availability_date >= today;
    },
    { message: 'availability_date cannot be in the past', path: ['availability_date'] }
  );

const listAvailabilityQuerySchema = z
  .object({
    trainer_id: z.string().uuid().optional(),
    availability_date: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

// --- Booking -----------------------------------------------------------

// trainer_availability_id is deliberately NOT part of this schema — the
// service derives it server-side by finding an Available
// TrainerAvailability slot that fully contains [start_time, end_time),
// per the documented decision. This also means the client never needs
// to know internal availability IDs, and can't supply a stale one.
const createBookingSchema = z
  .object({
    member_id: z.string().uuid(),
    trainer_id: z.string().uuid(),
    booking_date: z.coerce.date(),
    start_time: TIME_STRING,
    end_time: TIME_STRING,
  })
  .strict()
  .refine((data) => data.end_time > data.start_time, {
    message: 'end_time must be after start_time',
    path: ['end_time'],
  })
  .refine(
    (data) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return data.booking_date >= today;
    },
    { message: 'booking_date cannot be in the past', path: ['booking_date'] }
  );

const listBookingsQuerySchema = z
  .object({
    member_id: z.string().uuid().optional(),
    trainer_id: z.string().uuid().optional(),
    status: z.enum(['Scheduled', 'Completed', 'Cancelled', 'NoShow']).optional(),
    booking_date: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

// PATCH /bookings/:id/reschedule — new slot's availability coverage and
// overlap-safety are re-validated the same way as create, but that
// requires a database lookup (a fresh TrainerAvailability search), so
// it lives in the service, not here.
const rescheduleBookingSchema = z
  .object({
    booking_date: z.coerce.date(),
    start_time: TIME_STRING,
    end_time: TIME_STRING,
    reason: z.string().min(1).max(500),
  })
  .strict()
  .refine((data) => data.end_time > data.start_time, {
    message: 'end_time must be after start_time',
    path: ['end_time'],
  });

// PATCH /bookings/:id/complete — no body fields at all; a pure state
// transition, same reasoning as Feature 7's finalizeWorkoutSessionSchema.
const completeBookingSchema = z.object({}).strict();

const cancelBookingSchema = z
  .object({
    reason: z.string().min(1).max(500),
  })
  .strict();

// PATCH /bookings/:id/no-show — not in the frozen request-shapes list at
// all, but every other status-transition action with meaningful context
// (cancel, reopen) requires a reason, so an unexplained no-show marking
// would be the only status change in this entire module with zero audit
// trail. Treating this the same way Feature 8's measurement_date gap was
// treated: filling an undocumented but clearly-needed field rather than
// leaving the endpoint with no schema at all.
const noShowBookingSchema = z
  .object({
    reason: z.string().min(1).max(500).optional(),
  })
  .strict();

const reopenBookingSchema = z
  .object({
    reason: z.string().min(1).max(500),
  })
  .strict();

module.exports = {
  createAvailabilitySchema,
  listAvailabilityQuerySchema,
  createBookingSchema,
  listBookingsQuerySchema,
  rescheduleBookingSchema,
  completeBookingSchema,
  cancelBookingSchema,
  noShowBookingSchema,
  reopenBookingSchema,
};