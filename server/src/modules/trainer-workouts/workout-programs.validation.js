const { z } = require('zod');

// Matches the frozen Prisma enums exactly (FR-5.5).
const CATEGORY = z.enum(['Strength', 'Hypertrophy', 'Cardio', 'Rehabilitation']);
const DIFFICULTY = z.enum(['Beginner', 'Intermediate', 'Advanced']);
const TEMPLATE_STATUS = z.enum(['Active', 'Inactive']);

// --- Template ---------------------------------------------------------------

const createTemplateSchema = z
  .object({
    name: z.string().min(1).max(150),
    description: z.string().optional(),
    category: CATEGORY,
    difficulty_level: DIFFICULTY,
    estimated_duration_weeks: z.coerce.number().int().positive(),
  })
  .strict();

// status here is how deactivation happens (FR-5.7) — no separate endpoint.
const updateTemplateSchema = z
  .object({
    name: z.string().min(1).max(150).optional(),
    description: z.string().optional(),
    category: CATEGORY.optional(),
    difficulty_level: DIFFICULTY.optional(),
    estimated_duration_weeks: z.coerce.number().int().positive().optional(),
    status: TEMPLATE_STATUS.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

// --- Session ------------------------------------------------------------

const createSessionSchema = z
  .object({
    session_name: z.string().min(1).max(100),
    description: z.string().optional(),
    session_order: z.coerce.number().int().positive(),
  })
  .strict();

const updateSessionSchema = z
  .object({
    session_name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    session_order: z.coerce.number().int().positive().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

// --- Template Exercise ----------------------------------------------------

const createExerciseSchema = z
  .object({
    exercise_library_entry_id: z.string().uuid(),
    exercise_order: z.coerce.number().int().positive(),
    target_sets: z.coerce.number().int().positive(),
    target_reps: z.string().min(1).max(20), // supports ranges e.g. "8-12"
    target_weight: z.coerce.number().positive().optional(),
    rest_seconds: z.coerce.number().int().nonnegative().optional(),
    notes: z.string().optional(),
  })
  .strict();

const updateExerciseSchema = z
  .object({
    exercise_library_entry_id: z.string().uuid().optional(),
    exercise_order: z.coerce.number().int().positive().optional(),
    target_sets: z.coerce.number().int().positive().optional(),
    target_reps: z.string().min(1).max(20).optional(),
    target_weight: z.coerce.number().positive().optional(),
    rest_seconds: z.coerce.number().int().nonnegative().optional(),
    notes: z.string().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

// --- Assignment -----------------------------------------------------------

const assignTemplateSchema = z
  .object({
    member_id: z.string().uuid(),
    start_date: z.coerce.date().optional(),
    assignment_notes: z.string().optional(),
  })
  .strict();

module.exports = {
  createTemplateSchema,
  updateTemplateSchema,
  createSessionSchema,
  updateSessionSchema,
  createExerciseSchema,
  updateExerciseSchema,
  assignTemplateSchema,
};