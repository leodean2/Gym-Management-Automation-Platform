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

function findExerciseLibraryEntryById(id) {
  return prisma.exerciseLibraryEntry.findUnique({ where: { id } });
}

// --- Template (FR-5.5 / FR-5.6 / FR-5.7) ------------------------------------

function createTemplate(data) {
  return prisma.workoutProgramTemplate.create({ data });
}

function findTemplateById(id) {
  return prisma.workoutProgramTemplate.findUnique({
    where: { id },
    include: { sessions: { include: { exercises: true }, orderBy: { session_order: 'asc' } } },
  });
}

function listTemplates({ status, trainerId }) {
  const where = {};
  if (status) where.status = status;
  if (trainerId) where.created_by = trainerId;
  return prisma.workoutProgramTemplate.findMany({ where, orderBy: { created_at: 'desc' } });
}

function updateTemplate(id, data) {
  return prisma.workoutProgramTemplate.update({ where: { id }, data });
}

// --- Session -----------------------------------------------------------

function createSession(templateId, data) {
  return prisma.workoutProgramSession.create({
    data: { ...data, workout_program_template_id: templateId },
  });
}

function findSessionById(id) {
  return prisma.workoutProgramSession.findUnique({
    where: { id },
    include: { template: true },
  });
}

function updateSession(id, data) {
  return prisma.workoutProgramSession.update({ where: { id }, data });
}

// --- Template Exercise ---------------------------------------------------

function createExercise(sessionId, data) {
  return prisma.templateExercise.create({
    data: { ...data, workout_program_session_id: sessionId },
  });
}

function findExerciseById(id) {
  return prisma.templateExercise.findUnique({
    where: { id },
    include: { workout_program_session: { include: { template: true } } },
  });
}

function updateExercise(id, data) {
  return prisma.templateExercise.update({ where: { id }, data });
}

// --- Assignment (FR-5.8 / FR-5.9) -----------------------------------------

function createAssignment(data) {
  return prisma.workoutProgramAssignment.create({ data });
}

function findAssignmentById(id) {
  return prisma.workoutProgramAssignment.findUnique({
    where: { id },
    include: { member: { select: { user_id: true, current_trainer_id: true } }, trainer: true },
  });
}

function findAssignmentsByMember(memberId) {
  return prisma.workoutProgramAssignment.findMany({
    where: { member_id: memberId },
    orderBy: { assigned_date: 'desc' },
  });
}

function updateAssignment(id, data) {
  return prisma.workoutProgramAssignment.update({ where: { id }, data });
}

module.exports = {
  findTrainerByUserId,
  findMemberById,
  findExerciseLibraryEntryById,
  createTemplate,
  findTemplateById,
  listTemplates,
  updateTemplate,
  createSession,
  findSessionById,
  updateSession,
  createExercise,
  findExerciseById,
  updateExercise,
  createAssignment,
  findAssignmentById,
  findAssignmentsByMember,
  updateAssignment,
};