const paymentsService = require('./payments.service');
const { ok, created } = require('../../lib/apiResponse');

// Feature 11 — Payment & Invoice Management
// Controllers stay thin: validate input, call the service, shape the
// response envelope. Business logic belongs in payments.service.js.

// TODO: implement controller functions matching the routes in
// payments.routes.js, following auth.controller.js as the reference pattern.

module.exports = {
  // e.g. list, getById, create, update, ...
};
