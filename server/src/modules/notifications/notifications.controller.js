const notificationsService = require('./notifications.service');
const { ok, created } = require('../../lib/apiResponse');

// Feature 13 — Notifications & Reminders
// Controllers stay thin: validate input, call the service, shape the
// response envelope. Business logic belongs in notifications.service.js.

// TODO: implement controller functions matching the routes in
// notifications.routes.js, following auth.controller.js as the reference pattern.

module.exports = {
  // e.g. list, getById, create, update, ...
};
