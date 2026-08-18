const AppError = require('../lib/AppError');

/**
 * Role-based access control (FR-1.8).
 *
 * Usage:
 *   router.post('/members', authenticate, authorize('GymOwner', 'Receptionist', 'SuperAdmin'), ...)
 *
 * Must run AFTER `authenticate`, since it depends on req.user being set.
 *
 * This only checks ROLE. Ownership/assignment checks (e.g. "a Trainer may
 * only view members currently assigned to them") are a different, more
 * specific kind of authorization and belong in the service layer for that
 * module, not here - this middleware answers "is this role ever allowed to
 * call this endpoint at all," not "is this specific request allowed."
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      // authenticate() should always run first; this is a safeguard.
      return next(AppError.unauthorized());
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(AppError.forbidden());
    }

    next();
  };
}

module.exports = authorize;
