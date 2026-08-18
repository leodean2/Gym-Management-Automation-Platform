const express = require('express');
const membersController = require('./members.controller');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { registerMemberSchema, updateMemberSchema, searchMemberSchema } = require('./members.validation');
const { STAFF_ROLES, VIEW_ROLES, SEARCH_ROLES } = require('./members.constants');

// Feature 2 — Member Registration & Profile Management
// Pipeline mirrors auth/: authenticate -> authorize -> validate -> controller.

const router = express.Router();

// POST /api/v1/members
router.post(
  '/',
  authenticate,
  authorize(...STAFF_ROLES),
  validate(registerMemberSchema),
  asyncHandler(membersController.register)
);

// GET /api/v1/members
router.get(
  '/',
  authenticate,
  authorize(...SEARCH_ROLES),
  validate(searchMemberSchema, 'query'),
  asyncHandler(membersController.search)
);

// GET /api/v1/members/:id
// All VIEW_ROLES may hit this route; the service layer enforces the
// actual per-request ownership rule (Trainer -> assigned only, Member ->
// self only), since that depends on data authorize() doesn't have access to.
router.get(
  '/:id',
  authenticate,
  authorize(...VIEW_ROLES),
  asyncHandler(membersController.getProfile)
);

// PATCH /api/v1/members/:id
router.patch(
  '/:id',
  authenticate,
  authorize(...STAFF_ROLES),
  validate(updateMemberSchema),
  asyncHandler(membersController.update)
);

module.exports = router;
