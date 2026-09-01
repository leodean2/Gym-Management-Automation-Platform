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

templatesRouter.post(
  '/',
  authenticate,
  authorize(...TEMPLATE_CREATOR_ROLES),
  validate(createTemplateSchema),
  asyncHandler(nutritionController.createTemplate)
);

templatesRouter.get(
  '/',
  authenticate,
  authorize(...TEMPLATE_VIEW_ROLES),
  validate(listTemplatesQuerySchema, 'query'),
  asyncHandler(nutritionController.listTemplates)
);

templatesRouter.get(
  '/:id',
  authenticate,
  authorize(...TEMPLATE_VIEW_ROLES),
  asyncHandler(nutritionController.getTemplate)
);

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

assignmentsRouter.post(
  '/',
  authenticate,
  authorize(...ASSIGNMENT_CREATE_ROLES),
  validate(assignTemplateSchema),
  asyncHandler(nutritionController.assignTemplate)
);

assignmentsRouter.get(
  '/',
  authenticate,
  authorize(...ASSIGNMENT_LIST_ROLES),
  validate(listAssignmentsQuerySchema, 'query'),
  asyncHandler(nutritionController.listAssignments)
);

assignmentsRouter.get(
  '/:id',
  authenticate,
  authorize(...ASSIGNMENT_VIEW_ROLES),
  asyncHandler(nutritionController.getAssignment)
);

assignmentsRouter.post(
  '/:id/replace',
  authenticate,
  authorize(...ASSIGNMENT_REPLACE_ROLES),
  validate(replaceAssignmentSchema),
  asyncHandler(nutritionController.replaceAssignment)
);

assignmentsRouter.post(
  '/:id/complete',
  authenticate,
  authorize(...ASSIGNMENT_COMPLETE_ROLES),
  asyncHandler(nutritionController.completeAssignment)
);

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

memberPlanRouter.get(
  '/:memberId/nutrition-plan',
  authenticate,
  authorize(...MEMBER_PLAN_VIEW_ROLES),
  asyncHandler(nutritionController.getMemberActivePlan)
);

module.exports = { templatesRouter, assignmentsRouter, memberPlanRouter };