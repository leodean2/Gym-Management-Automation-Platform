const express = require('express');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const nutritionController = require('./nutrition.controller');
const {
  createTemplateSchema,
  updateTemplateSchema,
  listTemplatesQuerySchema,
  assignTemplateSchema,
  listAssignmentsQuerySchema,
  replaceAssignmentSchema,
  updateAssignmentSchema,
} = require('./nutrition.validation');
const {
  TEMPLATE_CREATOR_ROLES,
  TEMPLATE_VIEW_ROLES,
  TEMPLATE_UPDATE_ROLES,
  TEMPLATE_DEACTIVATE_ROLES,
  ASSIGNMENT_CREATE_ROLES,
  ASSIGNMENT_VIEW_ROLES,
  ASSIGNMENT_LIST_ROLES,
  MEMBER_PLAN_VIEW_ROLES,
  ASSIGNMENT_REPLACE_ROLES,
  ASSIGNMENT_COMPLETE_ROLES,
  ASSIGNMENT_UPDATE_ROLES,
} = require('./nutrition.constants');

// Feature 6 — Nutrition Plan Templates & Assignment
// See docs/api-design.md for the full endpoint list and role matrix,
// modified per the documented TEMPLATE_CREATOR_ROLES/ASSIGNMENT_CREATE_ROLES
// decision in nutrition.constants.js.
//
// Like memberships/attendance/trainer-workouts, this module owns more
// than one URL prefix, so it exports multiple routers — see app.js.

// --- /api/v1/nutrition-plan-templates ---------------------------------------
const templatesRouter = express.Router();

/**
 * @openapi
 * tags:
 *   name: Nutrition
 *   description: Nutrition Plan Templates and Assignments
 */

/**
 * @openapi
 * /nutrition-plan-templates:
 *   post:
 *     tags: [Nutrition]
 *     summary: Create a Nutrition Plan Template
 *     description: Trainer-only — schema ownership (created_by -> Trainer) rules this out for GymOwner/SuperAdmin despite the original doc's broader role table.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, goal, meal_guidelines]
 *             properties:
 *               name: { type: string }
 *               goal: { type: string, enum: [WeightLoss, MuscleGain, Maintenance, Rehabilitation] }
 *               meal_guidelines: { type: string }
 *               daily_calorie_target: { type: integer }
 *               protein_grams: { type: integer }
 *               carbohydrates_grams: { type: integer }
 *               fats_grams: { type: integer }
 *     responses:
 *       201: { description: Template created }
 */
templatesRouter.post(
  '/',
  authenticate,
  authorize(...TEMPLATE_CREATOR_ROLES),
  validate(createTemplateSchema),
  asyncHandler(nutritionController.createTemplate)
);

/**
 * @openapi
 * /nutrition-plan-templates:
 *   get:
 *     tags: [Nutrition]
 *     summary: List Nutrition Plan Templates
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: goal
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Active, Inactive] }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Paginated list }
 */
templatesRouter.get(
  '/',
  authenticate,
  authorize(...TEMPLATE_VIEW_ROLES),
  validate(listTemplatesQuerySchema, 'query'),
  asyncHandler(nutritionController.listTemplates)
);

/**
 * @openapi
 * /nutrition-plan-templates/{id}:
 *   get:
 *     tags: [Nutrition]
 *     summary: Get a Nutrition Plan Template
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Template detail }
 */
templatesRouter.get(
  '/:id',
  authenticate,
  authorize(...TEMPLATE_VIEW_ROLES),
  asyncHandler(nutritionController.getTemplate)
);

/**
 * @openapi
 * /nutrition-plan-templates/{id}:
 *   patch:
 *     tags: [Nutrition]
 *     summary: Update a Nutrition Plan Template
 *     description: Owning Trainer, or GymOwner if Inactive. Content edits blocked while the template itself is Inactive.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Updated template }
 *       409: { description: Template is Inactive }
 */
// PATCH /api/v1/nutrition-plan-templates/:id
// Route-level check is broad (Trainer or staff); the service enforces
// "owning Trainer, or GymOwner if that Trainer is Inactive," plus
// rejects content edits on an Inactive template.
templatesRouter.patch(
  '/:id',
  authenticate,
  authorize(...TEMPLATE_UPDATE_ROLES),
  validate(updateTemplateSchema),
  asyncHandler(nutritionController.updateTemplate)
);

/**
 * @openapi
 * /nutrition-plan-templates/{id}/deactivate:
 *   patch:
 *     tags: [Nutrition]
 *     summary: Deactivate a Nutrition Plan Template
 *     description: Staff-only, unconditional — no ownership check.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Template deactivated }
 *       403: { description: Role not permitted (TEMPLATE_DEACTIVATE_ROLES only) }
 */
// PATCH /api/v1/nutrition-plan-templates/:id/deactivate
// Staff-only, unconditional — no ownership check in the service, unlike
// the plain update above.
templatesRouter.patch(
  '/:id/deactivate',
  authenticate,
  authorize(...TEMPLATE_DEACTIVATE_ROLES),
  asyncHandler(nutritionController.deactivateTemplate)
);

// --- /api/v1/nutrition-plan-assignments -----------------------------------
const assignmentsRouter = express.Router();

/**
 * @openapi
 * /nutrition-plan-assignments:
 *   post:
 *     tags: [Nutrition]
 *     summary: Assign a Nutrition Plan Template to a Member
 *     description: A Member may only have one Active nutrition plan assignment at a time.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [member_id, nutrition_plan_template_id]
 *             properties:
 *               member_id: { type: string, format: uuid }
 *               nutrition_plan_template_id: { type: string, format: uuid }
 *               start_date: { type: string, format: date }
 *               assignment_notes: { type: string }
 *     responses:
 *       201: { description: Assignment created, status Active }
 *       409: { description: Member already has an Active assignment }
 */
assignmentsRouter.post(
  '/',
  authenticate,
  authorize(...ASSIGNMENT_CREATE_ROLES),
  validate(assignTemplateSchema),
  asyncHandler(nutritionController.assignTemplate)
);

/**
 * @openapi
 * /nutrition-plan-assignments:
 *   get:
 *     tags: [Nutrition]
 *     summary: List Nutrition Plan Assignments
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: member_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: trainer_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Active, Completed, Replaced] }
 *     responses:
 *       200: { description: Paginated list }
 */
assignmentsRouter.get(
  '/',
  authenticate,
  authorize(...ASSIGNMENT_LIST_ROLES),
  validate(listAssignmentsQuerySchema, 'query'),
  asyncHandler(nutritionController.listAssignments)
);

/**
 * @openapi
 * /nutrition-plan-assignments/{id}:
 *   get:
 *     tags: [Nutrition]
 *     summary: Get a Nutrition Plan Assignment
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Assignment detail }
 */
assignmentsRouter.get(
  '/:id',
  authenticate,
  authorize(...ASSIGNMENT_VIEW_ROLES),
  asyncHandler(nutritionController.getAssignment)
);

/**
 * @openapi
 * /nutrition-plan-assignments/{id}/replace:
 *   post:
 *     tags: [Nutrition]
 *     summary: Replace an Active assignment with a new plan
 *     description: Old assignment -> status Replaced (completion_date set); new assignment created Active.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nutrition_plan_template_id]
 *             properties:
 *               nutrition_plan_template_id: { type: string, format: uuid }
 *               start_date: { type: string, format: date }
 *               assignment_notes: { type: string }
 *     responses:
 *       201: { description: New Active assignment }
 *       409: { description: Current assignment is not Active }
 */
assignmentsRouter.post(
  '/:id/replace',
  authenticate,
  authorize(...ASSIGNMENT_REPLACE_ROLES),
  validate(replaceAssignmentSchema),
  asyncHandler(nutritionController.replaceAssignment)
);

/**
 * @openapi
 * /nutrition-plan-assignments/{id}/complete:
 *   post:
 *     tags: [Nutrition]
 *     summary: Mark a Nutrition Plan Assignment Completed
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Assignment marked Completed }
 */
assignmentsRouter.post(
  '/:id/complete',
  authenticate,
  authorize(...ASSIGNMENT_COMPLETE_ROLES),
  asyncHandler(nutritionController.completeAssignment)
);

/**
 * @openapi
 * /nutrition-plan-assignments/{id}:
 *   patch:
 *     tags: [Nutrition]
 *     summary: Update non-structural fields on an Assignment
 *     description: assignment_notes/start_date only — status changes only via /replace or /complete.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Updated assignment }
 */
assignmentsRouter.patch(
  '/:id',
  authenticate,
  authorize(...ASSIGNMENT_UPDATE_ROLES),
  validate(updateAssignmentSchema),
  asyncHandler(nutritionController.updateAssignment)
);

// --- /api/v1/members/:memberId/nutrition-plan -------------------------------
// Nested under the Members prefix, same convention as memberships'
// historyRouter, attendance's historyRouter, and trainer-workouts'
// historyRouter.
const memberPlanRouter = express.Router();

/**
 * @openapi
 * /members/{memberId}/nutrition-plan:
 *   get:
 *     tags: [Nutrition]
 *     summary: Get a Member's current Active nutrition plan
 *     description: Returns null (not 404) if no Active plan exists.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Active assignment, or null }
 */
memberPlanRouter.get(
  '/:memberId/nutrition-plan',
  authenticate,
  authorize(...MEMBER_PLAN_VIEW_ROLES),
  asyncHandler(nutritionController.getMemberActivePlan)
);

module.exports = { templatesRouter, assignmentsRouter, memberPlanRouter };