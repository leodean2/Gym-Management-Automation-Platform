const express = require('express');
const authController = require('./auth.controller');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/authenticate');
const { loginLimiter } = require('../../middleware/rateLimiter');

const router = express.Router();

// POST /api/v1/auth/login
// NFR-S3: IP-based rate limiting, in addition to FR-1.2's per-account lockout.
/**
 * @openapi
 * tags:
 *   name: Auth
 *   description: Authentication — login, password reset, password change
 */

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in and receive a JWT access token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     access_token:
 *                       type: string
 *                     expires_in:
 *                       type: string
 *                       example: 8h
 *                     user:
 *                       type: object
 *                       properties:
 *                         id: { type: string, format: uuid }
 *                         email: { type: string }
 *                         role: { type: string, enum: [SuperAdmin, GymOwner, Receptionist, Trainer, Member] }
 *                         account_status: { type: string }
 *                         must_change_password: { type: boolean }
 *                 error: { type: 'null' }
 *       401:
 *         description: Invalid email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       423:
 *         description: Account temporarily locked due to repeated failed login attempts
 */
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
