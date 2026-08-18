const membersService = require('./members.service');
const { ok, created } = require('../../lib/apiResponse');

/**
 * Thin by design: no Prisma, no permission checks, no business rules.
 * Just: pull validated input off req, call the service, shape the response.
 */

async function register(req, res) {
  const result = await membersService.registerMember(req.body, req.user);
  return created(res, result);
}

async function search(req, res) {
  const result = await membersService.searchMembers(req.query, req.user);
  return ok(res, result);
}

async function getProfile(req, res) {
  const result = await membersService.getMemberProfile(req.params.id, req.user);
  return ok(res, result);
}

async function update(req, res) {
  const result = await membersService.updateMember(req.params.id, req.body);
  return ok(res, result);
}

module.exports = { register, search, getProfile, update };
