const trainerWorkoutsService = require('./trainer-workouts.service');
const { ok, created } = require('../../lib/apiResponse');

// Feature 5 — Trainer Management & Workout Programs
// Controllers stay thin: validate input, call the service, shape the
// response envelope. Business logic belongs in trainer-workouts.service.js.

// TODO: implement controller functions matching the routes in
// trainer-workouts.routes.js, following auth.controller.js as the reference pattern.

module.exports = {
  // e.g. list, getById, create, update, ...
};
