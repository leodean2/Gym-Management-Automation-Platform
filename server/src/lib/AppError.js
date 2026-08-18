/**
 * A known, expected application error - e.g. "email already registered",
 * "membership not found", "account locked". Services/controllers throw
 * these; the global error handler middleware catches them and produces the
 * correct { data: null, error: { code, message } } response with the right
 * HTTP status.
 *
 * Anything that is NOT an AppError is treated as an unexpected server error
 * (500) by the error handler, and its details are logged but never sent to
 * the client - per NFR-AR4 / NFR-S5, we never leak stack traces or internal
 * detail in a response body.
 */
class AppError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }

  static badRequest(code, message) {
    return new AppError(400, code, message);
  }
  static unauthorized(message = 'Authentication required') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'You do not have permission to perform this action') {
    return new AppError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Resource not found') {
    return new AppError(404, 'NOT_FOUND', message);
  }
  static conflict(code, message) {
    return new AppError(409, code, message);
  }
  static locked(message = 'Account is temporarily locked') {
    return new AppError(423, 'ACCOUNT_LOCKED', message);
  }
  static tooManyRequests(message = 'Too many requests, please try again later') {
    return new AppError(429, 'RATE_LIMITED', message);
  }
}

module.exports = AppError;
