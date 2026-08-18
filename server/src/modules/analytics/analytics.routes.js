const express = require('express');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const analyticsController = require('./analytics.controller');

// Feature 12 — Admin Analytics Dashboard
// See docs/api-design.md for the full endpoint list and role matrix for
// this module (mirrors the frozen API design from the SRS/ERD phase).

const router = express.Router();

// TODO: wire up endpoints here, following the auth module's pattern:
//   router.post('/', authenticate, authorize('GymOwner', 'Receptionist'),
//     asyncHandler(analyticsController.create));

module.exports = router;
