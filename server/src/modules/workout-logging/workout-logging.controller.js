const workoutLoggingService = require('./workout-logging.service');
const { ok, created } = require('../../lib/apiResponse');

// Feature 7 — Workout Logging
// Controllers stay thin: validate input, call the service, shape the
// response envelope. Business logic belongs in workout-logging.service.js.

// TODO: implement controller functions matching the routes in
// workout-logging.routes.js, following auth.controller.js as the reference pattern.

module.exports = {
  // e.g. list, getById, create, update, ...
};
