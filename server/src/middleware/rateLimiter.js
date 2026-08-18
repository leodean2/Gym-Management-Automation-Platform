const rateLimit = require('express-rate-limit');
const { rateLimit: cfg } = require('../config/env');
const AppError = require('../lib/AppError');
const { fail } = require('../lib/apiResponse');

/**
 * NFR-S3: rate limiting on public endpoints, including the Login endpoint
 * (IP-based, complementing FR-1.2's per-account lockout - a different layer
 * of defense against a different attack pattern) and the Inquiry submission
 * endpoint (the system's only fully unauthenticated endpoint).
 */
function handler(req, res) {
  const err = AppError.tooManyRequests();
  fail(res, err.statusCode, err.code, err.message);
}

const windowMs = cfg.windowMinutes * 60 * 1000;

const generalLimiter = rateLimit({
  windowMs,
  max: cfg.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

const loginLimiter = rateLimit({
  windowMs,
  max: cfg.loginMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

const inquiryLimiter = rateLimit({
  windowMs,
  max: cfg.inquiryMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

module.exports = { generalLimiter, loginLimiter, inquiryLimiter };
