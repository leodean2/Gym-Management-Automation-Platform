/**
 * Wraps an async route handler so any thrown error (or rejected promise) is
 * automatically passed to next(), reaching the global error handler instead
 * of crashing the process or requiring try/catch in every controller.
 *
 * Usage: router.post('/login', asyncHandler(authController.login));
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
