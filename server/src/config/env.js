/**
 * Centralized environment configuration.
 *
 * Every other file in the app should read config from here, not from
 * process.env directly. This gives us one place to validate that required
 * secrets exist at startup (fail fast, not on the first request that needs
 * them), and one place to see every configurable value the system depends on.
 */
require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

module.exports = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: required('DATABASE_URL'),
  },

  auth: {
    jwtSecret: required('JWT_SECRET'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h', // NFR-P6 / Feature 1
    bcryptCostFactor: parseInt(process.env.BCRYPT_COST_FACTOR || '12', 10), // NFR-S2
  },

  loginProtection: {
    // FR-1.2
    maxFailedAttempts: parseInt(process.env.LOGIN_MAX_FAILED_ATTEMPTS || '5', 10),
    lockoutMinutes: parseInt(process.env.LOGIN_LOCKOUT_MINUTES || '15', 10),
  },

  passwordReset: {
    // FR-1.4
    tokenTtlMinutes: parseInt(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || '60', 10),
  },

  rateLimit: {
    // NFR-S3
    windowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || '15', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    loginMaxRequests: parseInt(process.env.LOGIN_RATE_LIMIT_MAX_REQUESTS || '10', 10),
    inquiryMaxRequests: parseInt(process.env.INQUIRY_RATE_LIMIT_MAX_REQUESTS || '5', 10),
  },

  membership: {
    // FR-11.5
    paymentWindowHours: parseInt(process.env.MEMBERSHIP_PAYMENT_WINDOW_HOURS || '48', 10),
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.NOTIFICATION_FROM_EMAIL || 'no-reply@gymrocksfitness.com',
  },

  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
};
