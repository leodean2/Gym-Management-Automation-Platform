const AppError = require('../lib/AppError');

/**
 * Generic validation middleware factory.
 *
 * Usage:
 *   router.post('/', validate(registerMemberSchema), ...)          // validates req.body
 *   router.get('/', validate(searchMemberSchema, 'query'), ...)    // validates req.query
 *
 * On success, replaces req[source] with the parsed (and possibly
 * coerced/defaulted) data, so controllers can trust its shape completely -
 * no re-checking, no stray unvalidated fields.
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const firstIssue = result.error.issues[0];
      const path = firstIssue.path.join('.');
      const message = path ? `${path}: ${firstIssue.message}` : firstIssue.message;
      return next(AppError.badRequest('VALIDATION_ERROR', message));
    }

    req[source] = result.data;
    next();
  };
}

module.exports = validate;
