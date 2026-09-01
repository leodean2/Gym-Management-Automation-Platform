const { z } = require('zod');

const GOAL = z.enum(['WeightLoss', 'MuscleGain', 'Maintenance', 'Rehabilitation']);
const TEMPLATE_STATUS = z.enum(['Active', 'Inactive']);
const ASSIGNMENT_STATUS = z.enum(['Active', 'Completed', 'Replaced']);

// --- Template (FR-6.1) -------------------------------------------------

const createTemplateSchema = z
  .object({
    name: z.string().min(1).max(150),
    goal: GOAL,
    meal_guidelines: z.string().min(1),
    daily_calorie_target: z.coerce.number().int().positive().optional(),
    protein_grams: z.coerce.number().int().nonnegative().optional(),
    carbohydrates_grams: z.coerce.number().int().nonnegative().optional(),
    fats_grams: z.coerce.number().int().nonnegative().optional(),
  })
  .strict();

const updateTemplateSchema = z
  .object({
    name: z.string().min(1).max(150).optional(),
    goal: GOAL.optional(),
    meal_guidelines: z.string().min(1).optional(),
    daily_calorie_target: z.coerce.number().int().positive().optional(),
    protein_grams: z.coerce.number().int().nonnegative().optional(),
    carbohydrates_grams: z.coerce.number().int().nonnegative().optional(),
    fats_grams: z.coerce.number().int().nonnegative().optional(),
    status: TEMPLATE_STATUS.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

const listTemplatesQuerySchema = z
  .object({
    status: TEMPLATE_STATUS.optional(),
    goal: GOAL.optional(),
    search: z.string().optional(),
    mine: z.enum(['true', 'false']).optional(),
  })
  .strict();

// --- Assignment (FR-6.4 / FR-6.5) ---------------------------------------

// Flat POST /nutrition-plan-assignments (no :templateId in the URL, unlike
// Workout Programs' nested /workout-program-templates/:templateId/assign)
// — nutrition_plan_template_id has to travel in the body instead.
const assignTemplateSchema = z
  .object({
    member_id: z.string().uuid(),
    nutrition_plan_template_id: z.string().uuid(),
    start_date: z.coerce.date().optional(),
    assignment_notes: z.string().optional(),
  })
  .strict();

const listAssignmentsQuerySchema = z
  .object({
    member_id: z.string().uuid().optional(),
    trainer_id: z.string().uuid().optional(),
    status: ASSIGNMENT_STATUS.optional(),
  })
  .strict();

// POST /nutrition-plan-assignments/:id/replace — swaps the currently
// Active assignment for a new one (old row -> Replaced, new row -> Active),
// per the frozen Replaced status.
const replaceAssignmentSchema = z
  .object({
    nutrition_plan_template_id: z.string().uuid(),
    start_date: z.coerce.date().optional(),
    assignment_notes: z.string().optional(),
  })
  .strict();

// PATCH /nutrition-plan-assignments/:id — non-structural edits only.
const updateAssignmentSchema = z
  .object({
    start_date: z.coerce.date().optional(),
    assignment_notes: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

module.exports = {
  createTemplateSchema,
  updateTemplateSchema,
  listTemplatesQuerySchema,
  assignTemplateSchema,
  listAssignmentsQuerySchema,
  replaceAssignmentSchema,
  updateAssignmentSchema,
};