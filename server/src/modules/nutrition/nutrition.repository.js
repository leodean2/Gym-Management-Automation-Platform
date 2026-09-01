const prisma = require('../../config/db');

/**
 * Only Prisma access lives here. No authorization, no business rules.
 */

// --- Helpers needed for authorization/validation in the service ----------

function findTrainerByUserId(userId) {
  return prisma.trainer.findUnique({ where: { user_id: userId } });
}

function findMemberById(id) {
  return prisma.member.findUnique({ where: { id } });
}

// --- Template (FR-6.1 / FR-6.2 / FR-6.3) ------------------------------------

function createTemplate(data) {
  return prisma.nutritionPlanTemplate.create({ data });
}

function findTemplateById(id) {
  return prisma.nutritionPlanTemplate.findUnique({ where: { id } });
}

function buildTemplateWhere({ search, goal, status, trainerId }) {
  const where = {};
  const and = [];

  if (search) and.push({ name: { contains: search, mode: 'insensitive' } });
  if (goal) and.push({ goal });
  if (status) and.push({ status });
  if (trainerId) and.push({ created_by: trainerId });

  if (and.length > 0) where.AND = and;
  return where;
}

function listTemplates(where) {
  return prisma.nutritionPlanTemplate.findMany({ where, orderBy: { created_at: 'desc' } });
}

function updateTemplate(id, data) {
  return prisma.nutritionPlanTemplate.update({ where: { id }, data });
}

// FR-6.3: deactivation is its own action, unconditional (staff-only, no
// ownership check) — kept as its own repository function so the service
// call site reads as "deactivate," not "update with a status field."
function deactivateTemplate(id) {
  return prisma.nutritionPlanTemplate.update({ where: { id }, data: { status: 'Inactive' } });
}

// --- Assignment (FR-6.4 / FR-6.5) -----------------------------------------

function findActiveAssignmentByMember(memberId) {
  return prisma.nutritionPlanAssignment.findFirst({
    where: { member_id: memberId, status: 'Active' },
  });
}

function createAssignment(data) {
  return prisma.nutritionPlanAssignment.create({ data });
}

function findAssignmentById(id) {
  return prisma.nutritionPlanAssignment.findUnique({
    where: { id },
    include: { member: { select: { user_id: true, current_trainer_id: true } }, trainer: true },
  });
}

function buildAssignmentWhere({ member_id, trainer_id, status }) {
  const where = {};
  const and = [];

  if (member_id) and.push({ member_id });
  if (trainer_id) and.push({ trainer_id });
  if (status) and.push({ status });

  if (and.length > 0) where.AND = and;
  return where;
}

function listAssignments(where) {
  return prisma.nutritionPlanAssignment.findMany({ where, orderBy: { assigned_date: 'desc' } });
}

/**
 * FR-6.5: current Active assignment -> Replaced (with completion_date set),
 * new assignment created Active, atomically — a member must never end up
 * with zero or two Active assignments mid-operation.
 */
function replaceAssignment({ currentAssignmentId, newAssignmentData }) {
  return prisma.$transaction(async (tx) => {
    const replaced = await tx.nutritionPlanAssignment.update({
      where: { id: currentAssignmentId },
      data: { status: 'Replaced', completion_date: new Date() },
    });

    const created = await tx.nutritionPlanAssignment.create({ data: newAssignmentData });

    return { replaced, created };
  });
}

function completeAssignment(id) {
  return prisma.nutritionPlanAssignment.update({
    where: { id },
    data: { status: 'Completed', completion_date: new Date() },
  });
}

// PATCH /:id — assignment_notes / start_date only, enforced at the
// validation boundary, not by this function.
function updateAssignment(id, data) {
  return prisma.nutritionPlanAssignment.update({ where: { id }, data });
}

function findMemberActivePlan(memberId) {
  return prisma.nutritionPlanAssignment.findFirst({
    where: { member_id: memberId, status: 'Active' },
    include: { template: true },
  });
}

module.exports = {
  findTrainerByUserId,
  findMemberById,
  createTemplate,
  findTemplateById,
  buildTemplateWhere,
  listTemplates,
  updateTemplate,
  deactivateTemplate,
  findActiveAssignmentByMember,
  createAssignment,
  findAssignmentById,
  buildAssignmentWhere,
  listAssignments,
  replaceAssignment,
  completeAssignment,
  updateAssignment,
  findMemberActivePlan,
};