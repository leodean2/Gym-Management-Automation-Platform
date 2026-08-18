const express = require('express');
const authController = require('./auth.controller');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/authenticate');
const { loginLimiter } = require('../../middleware/rateLimiter');

const router = express.Router();

// POST /api/v1/auth/login
// NFR-S3: IP-based rate limiting, in addition to FR-1.2's per-account lockout.
router.post('/login', loginLimiter, asyncHandler(authController.login));

// POST /api/v1/auth/logout
router.post('/logout', authenticate, asyncHandler(authController.logout));

// POST /api/v1/auth/password-reset/request
router.post('/password-reset/request', asyncHandler(authController.requestPasswordReset));

// POST /api/v1/auth/password-reset/complete
router.post('/password-reset/complete', asyncHandler(authController.completePasswordReset));

// POST /api/v1/auth/password/change-first-login
router.post(
  '/password/change-first-login',
  authenticate,
  asyncHandler(authController.changePasswordFirstLogin)
);

// POST /api/v1/auth/password/change
router.post('/password/change', authenticate, asyncHandler(authController.changePassword));

module.exports = router;
