const { z } = require('zod');

// Feature 8 — Progress Tracking (Body Measurements + Personal Records)
// Zod schemas for this module's request bodies/queries. PersonalRecord
// has no create/update schemas at all — it's system-maintained, never
// touched directly by a client (see workout-progress.service.js's
// updatePersonalRecordsFromSession).

// --- Body Measurements ----------------------------------------------------

// POST /body-measurements — member_id required; every measurement field
// optional but at least one must be present (a measurement record with
// zero actual measurements and only notes wouldn't be meaningful).
// measurement_date is client-supplied (a real business date, distinct
// from created_at's server-generated audit timestamp) — mirrors
// booking_date/assigned_date elsewhere in this system.
const createBodyMeasurementSchema = z
  .object({
    member_id: z.string().uuid(),
    measurement_date: z.coerce.date(),
    weight_kg: z.coerce.number().positive().optional(),
    body_fat_percentage: z.coerce.number().positive().max(100).optional(),
    chest_cm: z.coerce.number().positive().optional(),
    waist_cm: z.coerce.number().positive().optional(),
    hips_cm: z.coerce.number().positive().optional(),
    left_arm_cm: z.coerce.number().positive().optional(),
    right_arm_cm: z.coerce.number().positive().optional(),
    left_thigh_cm: z.coerce.number().positive().optional(),
    right_thigh_cm: z.coerce.number().positive().optional(),
    notes: z.string().optional(),
  })
  .strict()
  .refine(
    (data) =>
      [
        'weight_kg',
        'body_fat_percentage',
        'chest_cm',
        'waist_cm',
        'hips_cm',
        'left_arm_cm',
        'right_arm_cm',
        'left_thigh_cm',
        'right_thigh_cm',
      ].some((field) => data[field] !== undefined),
    { message: 'At least one measurement field must be provided' }
  );

// GET /body-measurements — filters by member_id + a date range
// (from/to), per the frozen design. member_id is optional at the schema
// level since a Member's own requests never need to supply it — the
// service forces it from the requester's own Member record instead of
// trusting the query string for that role.
const listBodyMeasurementsQuerySchema = z
  .object({
    member_id: z.string().uuid().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict()
  .refine((data) => !data.from || !data.to || data.from <= data.to, {
    message: '"from" must be on or before "to"',
    path: ['from'],
  });

// --- Personal Records -------------------------------------------------------

// GET /personal-records — filters by member_id + exercise_library_entry_id.
// Same member_id-optional-at-schema-level reasoning as above.
const listPersonalRecordsQuerySchema = z
  .object({
    member_id: z.string().uuid().optional(),
    exercise_library_entry_id: z.string().uuid().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

module.exports = {
  createBodyMeasurementSchema,
  listBodyMeasurementsQuerySchema,
  listPersonalRecordsQuerySchema,
};