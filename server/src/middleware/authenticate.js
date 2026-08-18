const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { auth } = require('../config/env');
const AppError = require('../lib/AppError');
const asyncHandler = require('../lib/asyncHandler');

/**
 * Verifies the JWT on every protected request, then performs the two checks
 * that a stateless token cannot express by itself:
 *
 *  1. FR-1.9 - Account status is checked on every request, not just at
 *     login. A user deactivated mid-session is rejected immediately, even
 *     though their JWT has not expired.
 *
 *  2. FR-1.5 / FR-1.7 - If the user's password was changed AFTER this token
 *     was issued, the token is considered invalidated. We compare the JWT's
 *     `iat` (issued-at) claim against `password_changed_at`. This is what
 *     lets a stateless, non-blacklisted JWT design (Feature 1's frozen
 *     decision) still satisfy "old sessions become invalid after a reset."
 *
 * On success, attaches `req.user` = { id, role, accountStatus } for
 * downstream middleware/controllers to use.
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw AppError.unauthorized();
  }

  const token = header.slice('Bearer '.length);

  let payload;
  try {
    payload = jwt.verify(token, auth.jwtSecret);
  } catch (err) {
    throw AppError.unauthorized('Invalid or expired token');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      role: true,
      account_status: true,
      password_changed_at: true,
      must_change_password: true,
    },
  });

  if (!user) {
    throw AppError.unauthorized();
  }

  // FR-1.9: reject immediately if the account is no longer Active,
  // regardless of remaining token validity.
  if (user.account_status !== 'Active') {
    throw new AppError(403, 'ACCOUNT_INACTIVE', 'This account is not active');
  }

  // FR-1.5 / FR-1.7: reject tokens issued before the most recent password
  // change/reset.
  if (user.password_changed_at) {
    const tokenIssuedAt = payload.iat * 1000; // jwt iat is in seconds
    if (tokenIssuedAt < user.password_changed_at.getTime()) {
      throw AppError.unauthorized('Session expired due to password change. Please log in again.');
    }
  }

  req.user = {
    id: user.id,
    role: user.role,
    mustChangePassword: user.must_change_password,
  };

  next();
});

module.exports = authenticate;
