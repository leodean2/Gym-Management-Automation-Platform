const authService = require('./auth.service');
const {
  loginSchema,
  requestPasswordResetSchema,
  completePasswordResetSchema,
  changePasswordSchema,
} = require('./auth.validation');
const { ok } = require('../../lib/apiResponse');
const AppError = require('../../lib/AppError');

/**
 * Controllers stay thin on purpose: parse/validate input, call the service,
 * shape the response. All business logic (lockout rules, token generation,
 * password policy enforcement) lives in auth.service.js - that's what makes
 * the service layer independently testable without spinning up HTTP.
 */

async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw AppError.badRequest('VALIDATION_ERROR', parsed.error.issues[0].message);
  }

  const result = await authService.login(parsed.data);
  return ok(res, result);
}

async function logout(req, res) {
  // FR-1.3: stateless JWT, no server-side blacklist in v1. "Logout" is
  // fundamentally a client-side action (discard the token); this endpoint
  // exists mainly to give the frontend a clean, explicit call to make.
  return ok(res, { message: 'Logged out successfully' });
}

async function requestPasswordReset(req, res) {
  const parsed = requestPasswordResetSchema.safeParse(req.body);
  if (!parsed.success) {
    throw AppError.badRequest('VALIDATION_ERROR', parsed.error.issues[0].message);
  }

  const result = await authService.requestPasswordReset(parsed.data);
  return ok(res, result);
}

async function completePasswordReset(req, res) {
  const parsed = completePasswordResetSchema.safeParse(req.body);
  if (!parsed.success) {
    throw AppError.badRequest('VALIDATION_ERROR', parsed.error.issues[0].message);
  }

  const result = await authService.completePasswordReset(parsed.data);
  return ok(res, result);
}

async function changePasswordFirstLogin(req, res) {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    throw AppError.badRequest('VALIDATION_ERROR', parsed.error.issues[0].message);
  }

  const result = await authService.changePassword(req.user.id, parsed.data, {
    isFirstLogin: true,
  });
  return ok(res, result);
}

async function changePassword(req, res) {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    throw AppError.badRequest('VALIDATION_ERROR', parsed.error.issues[0].message);
  }

  const result = await authService.changePassword(req.user.id, parsed.data, {
    isFirstLogin: false,
  });
  return ok(res, result);
}

module.exports = {
  login,
  logout,
  requestPasswordReset,
  completePasswordReset,
  changePasswordFirstLogin,
  changePassword,
};
