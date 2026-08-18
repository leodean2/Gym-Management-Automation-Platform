const AppError = require('../lib/AppError');
const { fail } = require('../lib/apiResponse');

/**
 * Global error handler - must be registered LAST, after all routes.
 *
 * Known errors (AppError) are translated into the { data: null, error }
 * envelope with their intended status code.
 *
 * Anything else is an unexpected bug: log the full detail server-side only,
 * and return a generic 500 to the client. Per NFR-AR4 / NFR-S5, raw stack
 * traces, SQL errors, and internal exception detail must never reach the
 * response body.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return fail(res, err.statusCode, err.code, err.message);
  }

  console.error('[UNEXPECTED ERROR]', err);
  return fail(res, 500, 'INTERNAL_SERVER_ERROR', 'Something went wrong. Please try again.');
}

module.exports = errorHandler;
