const { z } = require('zod');

// Feature 9 — Exercise Library
// Zod schemas for this module's request bodies/queries. Field names
// (name, status, muscle_group) are corrected against schema.prisma's
// ExerciseLibraryEntry model, not the doc's original request-shape
// example — see the documented decision: schema.prisma is the frozen
// source of truth when the two disagree.

// Matches the frozen Prisma enums exactly — 3 types, 5 categories, no
// Timed/Distance.
const EXERCISE_TYPE = z.enum(['Weighted', 'Bodyweight', 'Cardio']);
const EXERCISE_CATEGORY = z.enum(['Strength', 'Cardio', 'Flexibility', 'Mobility', 'Rehabilitation']);
const EXERCISE_STATUS = z.enum(['Active', 'Inactive']);

// POST /exercise-library — muscle_group required (schema column is
// NOT NULL with no default); free text, not an enum, since
// schema.prisma models it as a plain String with no accompanying enum.
const createExerciseSchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    exercise_type: EXERCISE_TYPE,
    category: EXERCISE_CATEGORY,
    muscle_group: z.string().min(1).max(100),
  })
  .strict();

// PATCH /exercise-library/:id — partial update, muscle_group optional
// here (unlike create). status is deliberately excluded: deactivate/
// reactivate are their own endpoints, same pattern as Nutrition Plan
// Templates.
const updateExerciseSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    exercise_type: EXERCISE_TYPE.optional(),
    category: EXERCISE_CATEGORY.optional(),
    muscle_group: z.string().min(1).max(100).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

// GET /exercise-library — filters by exercise_type, category, is_active,
// search, per the frozen design's "Filters" list. Note the filter is
// named is_active in the doc but maps to the status enum here — kept the
// query param itself as status to stay consistent with every other
// module's status-filter naming (Nutrition, Workout Programs), rather
// than introducing a differently-named boolean-style filter for this
// module alone.
const listExercisesQuerySchema = z
  .object({
    exercise_type: EXERCISE_TYPE.optional(),
    category: EXERCISE_CATEGORY.optional(),
    status: EXERCISE_STATUS.optional(),
    search: z.string().trim().min(1).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

module.exports = {
  createExerciseSchema,
  updateExerciseSchema,
  listExercisesQuerySchema,
};