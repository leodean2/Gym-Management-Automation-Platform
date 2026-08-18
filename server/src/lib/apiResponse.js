/**
 * Every endpoint in this API returns the same envelope shape, success or
 * failure, per NFR-M2 and the frozen API design:
 *
 *   { "data": { ... }, "error": null }
 *   { "data": null, "error": { "code": "...", "message": "..." } }
 *
 * Use these helpers instead of calling res.json() directly, so the shape
 * never drifts between modules.
 */

function ok(res, data, statusCode = 200) {
  return res.status(statusCode).json({ data, error: null });
}

function created(res, data) {
  return ok(res, data, 201);
}

function noContent(res) {
  return res.status(204).send();
}

function fail(res, statusCode, code, message) {
  return res.status(statusCode).json({
    data: null,
    error: { code, message },
  });
}

module.exports = { ok, created, noContent, fail };
