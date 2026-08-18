const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const prisma = require('../../config/db');
const { auth, loginProtection, passwordReset } = require('../../config/env');
const AppError = require('../../lib/AppError');

function issueToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, auth.jwtSecret, {
    expiresIn: auth.jwtExpiresIn,
  });
}

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    account_status: user.account_status,
    must_change_password: user.must_change_password,
  };
}

/**
 * FR-1.1 / FR-1.2 / FR-1.9 - Login.
 *
 * Verifies credentials, enforces account-status and lockout rules, and
 * issues a JWT on success. Uses a generic error for "wrong password" vs
 * "unknown email" where it matters for security (anti-enumeration), while
 * still giving useful, specific feedback for lockout.
 */
async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // Generic message - do not reveal whether the account exists.
    throw AppError.unauthorized('Invalid email or password');
  }

  if (user.account_status !== 'Active') {
    throw new AppError(403, 'ACCOUNT_INACTIVE', 'This account is not active');
  }

  if (user.lockout_until && user.lockout_until > new Date()) {
    // FR-1.2: locked accounts get a distinct status code (423), separate
    // from generic rate limiting (429).
    throw AppError.locked('Account is temporarily locked due to repeated failed login attempts');
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    const failedCount = user.failed_login_count + 1;
    const hitLimit = failedCount >= loginProtection.maxFailedAttempts;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failed_login_count: hitLimit ? 0 : failedCount,
        lockout_until: hitLimit
          ? new Date(Date.now() + loginProtection.lockoutMinutes * 60 * 1000)
          : user.lockout_until,
      },
    });

    if (hitLimit) {
      throw AppError.locked('Account is temporarily locked due to repeated failed login attempts');
    }
    throw AppError.unauthorized('Invalid email or password');
  }

  // Successful login: reset failed-attempt counter (FR-1.2).
  await prisma.user.update({
    where: { id: user.id },
    data: { failed_login_count: 0, lockout_until: null },
  });

  const accessToken = issueToken(user);

  return {
    access_token: accessToken,
    expires_in: auth.jwtExpiresIn,
    user: sanitizeUser(user),
  };
}

/**
 * FR-1.4 - Request password reset.
 *
 * Always returns successfully regardless of whether the email exists
 * (anti-enumeration - FR-1.4's explicit requirement). Invalidates any
 * previously issued, unused token for this user before issuing a new one.
 */
async function requestPasswordReset({ email }) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    // Invalidate previous unused tokens.
    await prisma.passwordResetToken.updateMany({
      where: { user_id: user.id, used_at: null },
      data: { used_at: new Date() },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await prisma.passwordResetToken.create({
      data: {
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + passwordReset.tokenTtlMinutes * 60 * 1000),
      },
    });

    // TODO: send email via Resend containing a link with `rawToken`.
    // The raw token is only ever sent here - only its hash is persisted.
  }

  return {
    message: 'If an account exists for that email, a password reset link has been sent.',
  };
}

/**
 * FR-1.5 - Complete password reset.
 *
 * Validates the token, updates the password, marks the token used, and
 * bumps password_changed_at so any existing JWTs are treated as invalid
 * (see middleware/authenticate.js).
 */
async function completePasswordReset({ token, new_password }) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token_hash: tokenHash },
  });

  if (!resetToken || resetToken.used_at || resetToken.expires_at < new Date()) {
    throw AppError.unauthorized('Invalid or expired reset token');
  }

  const passwordHash = await bcrypt.hash(new_password, auth.bcryptCostFactor);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.user_id },
      data: { password_hash: passwordHash, password_changed_at: new Date() },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used_at: new Date() },
    }),
  ]);

  return { message: 'Password reset successfully' };
}

/**
 * FR-1.6 - First-login password change (clears must_change_password).
 * FR-1.7 - Change password for an already-onboarded user.
 * Both share the same core logic; only the must_change_password bookkeeping
 * differs.
 */
async function changePassword(userId, { current_password, new_password }, { isFirstLogin }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  const passwordMatches = await bcrypt.compare(current_password, user.password_hash);
  if (!passwordMatches) {
    throw AppError.unauthorized('Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(new_password, auth.bcryptCostFactor);

  await prisma.user.update({
    where: { id: userId },
    data: {
      password_hash: passwordHash,
      password_changed_at: new Date(),
      must_change_password: false,
    },
  });

  return {
    message: 'Password changed successfully',
    ...(isFirstLogin ? { must_change_password: false } : {}),
  };
}

module.exports = {
  login,
  requestPasswordReset,
  completePasswordReset,
  changePassword,
};
