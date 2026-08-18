const membershipsService = require('./memberships.service');
const { ok, created } = require('../../lib/apiResponse');

async function createPlan(req, res) {
  const result = await membershipsService.createPlan(req.body, req.user);
  return created(res, result);
}

async function listPlans(req, res) {
  const result = await membershipsService.listPlans(req.query);
  return ok(res, result);
}

async function updatePlan(req, res) {
  const result = await membershipsService.updatePlan(req.params.id, req.body, req.user);
  return ok(res, result);
}

async function createMembership(req, res) {
  const result = await membershipsService.createMembership(req.body, req.user);
  return created(res, result);
}

async function renewMembership(req, res) {
  const result = await membershipsService.renewMembership(req.params.id, req.body, req.user);
  return created(res, result);
}

async function getMembership(req, res) {
  const result = await membershipsService.getMembership(req.params.id, req.user);
  return ok(res, result);
}

async function suspendMembership(req, res) {
  const result = await membershipsService.suspendMembership(req.params.id, req.body);
  return ok(res, result);
}

async function getMembershipHistory(req, res) {
  const result = await membershipsService.getMembershipHistory(req.params.memberId, req.user);
  return ok(res, result);
}

module.exports = {
  createPlan,
  listPlans,
  updatePlan,
  createMembership,
  renewMembership,
  getMembership,
  suspendMembership,
  getMembershipHistory,
};
