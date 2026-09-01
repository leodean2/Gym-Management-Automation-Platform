const { z } = require('zod');

// Feature 7 — Workout Logging (Performed)
// Zod schemas for this module's request bodies, per the frozen API design.
// Kept in sync with schema.prisma's WorkoutSession/WorkoutExercise NOT
// NULL / enum constraints.

// --- Workout Session -----------------------------------------------------

// POST /workout-sessions — one WorkoutSession represents one day's
// workout against a specific WorkoutProgramAssignment + the
// WorkoutProgramSession being performed that day. Status/started_at are
// never client-supplied: the service sets status: 'InProgress' and
// started_at: new Date() itself, matching "Session starts InProgress."
const createWorkoutSessionSchema = z
  .object({
    workout_program_assignment_id: z.string().uuid(),
    workout_program_session_id: z.string().uuid(),
    session_date: z.coerce.date(),
    notes: z.string().optional(),
  })
  .strict();

// PATCH /workout-sessions/:id/finalize — no body fields at all; finalizing
// is a pure state transition (InProgress -> Finalized), not an update.
// Kept as an explicit (empty) schema rather than skipping validation
// entirely, so an accidental body with unexpected fields is still
// rejected via .strict() instead of silently ignored.
const finalizeWorkoutSessionSchema = z.object({}).strict();

// PATCH /workout-sessions/:id/reopen — reason is required: it's the only
// field WorkoutSessionReopenHistory needs from the requester (reopened_by/
// reopened_at are derived server-side from the acting user and current time).
const reopenWorkoutSessionSchema = z
  .object({
    reason: z.string().min(1).max(500),
  })
  .strict();

// GET /workout-sessions — supports the same member/trainer/status-style
// filtering precedent set by nutrition's listAssignmentsQuerySchema.
const listWorkoutSessionsQuerySchema = z
  .object({
    member_id: z.string().uuid().optional(),
    workout_program_assignment_id: z.string().uuid().optional(),
    status: z.enum(['InProgress', 'Finalized']).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

// --- Workout Exercise -----------------------------------------------------

// POST /workout-sessions/:id/exercises — exercise_library_entry_id is the
// only identifying field the client provides. template_exercise_id is
// deliberately NOT part of this schema: the service derives it server-side
// by matching exercise_library_entry_id against the session's
// WorkoutProgramSession's TemplateExercises — found means prescribed
// (template_exercise_id set), not found means ad-hoc (left NULL). This
// prevents a client from attaching a logged exercise to the wrong
// TemplateExercise, one from a different session, or a fabricated id.
// Every performed_* field is optional per the frozen decision ("All
// optional except required foreign keys.") — a Member may log sets/reps
// now and fill in weight/exertion later, one field at a time, across
// multiple PATCH calls.
const logExerciseSchema = z
  .object({
    exercise_library_entry_id: z.string().uuid(),
    performed_sets: z.coerce.number().int().positive().optional(),
    performed_reps: z.coerce.number().int().positive().optional(),
    performed_weight: z.coerce.number().positive().optional(),
    rest_seconds: z.coerce.number().int().nonnegative().optional(),
    duration_seconds: z.coerce.number().int().positive().optional(),
    distance: z.coerce.number().positive().optional(),
    perceived_exertion: z.coerce.number().int().min(1).max(10).optional(),
    notes: z.string().optional(),
  })
  .strict();

// PATCH /workout-exercises/:id — exercise_library_entry_id is excluded
// here too (unlike create): swapping which exercise a logged entry refers
// to isn't an "update," it's really a different log entry — same
// reasoning nutrition.validation.js's updateAssignmentSchema used to
// exclude structural fields from a plain PATCH. Since
// exercise_library_entry_id can't change, template_exercise_id never
// needs re-deriving on update either.
const updateExerciseSchema = z
  .object({
    performed_sets: z.coerce.number().int().positive().optional(),
    performed_reps: z.coerce.number().int().positive().optional(),
    performed_weight: z.coerce.number().positive().optional(),
    rest_seconds: z.coerce.number().int().nonnegative().optional(),
    duration_seconds: z.coerce.number().int().positive().optional(),
    distance: z.coerce.number().positive().optional(),
    perceived_exertion: z.coerce.number().int().min(1).max(10).optional(),
    notes: z.string().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

module.exports = {
  createWorkoutSessionSchema,
  finalizeWorkoutSessionSchema,
  reopenWorkoutSessionSchema,
  listWorkoutSessionsQuerySchema,
  logExerciseSchema,
  updateExerciseSchema,
};