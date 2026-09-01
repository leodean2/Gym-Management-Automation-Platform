const nutritionRepository = require('./nutrition.repository');
const trainersRepository = require('../trainer-workouts/trainers.repository'); // Inactive-Trainer override check
const AppError = require('../../lib/AppError');

// Feature 6 — Nutrition Plan Templates & Assignment
// All business rules for this module live here. Keep this layer
// framework-agnostic — no req/res here.

// --- Ownership / override helper ----------------------------------------

async function assertCanManageTemplate(template, requester) {
  if (requester.role === 'Trainer') {
    const trainer = await nutritionRepository.findTrainerByUserId(requester.id);
    if (trainer && trainer.id === template.created_by) return;
    throw AppError.forbidden('You may only manage nutrition plan templates you created');
  }

  if (requester.role === 'GymOwner' || requester.role === 'SuperAdmin') {
    const creatingTrainer = await trainersRepository.findById(template.created_by);
    if (creatingTrainer && creatingTrainer.user.account_status === 'Inactive') return;
    throw AppError.forbidden(
      'This template belongs to an active Trainer; only they may manage it'
    );
  }

  throw AppError.forbidden();
}

async function assertCanActOnAssignment(assignment, requester, actionLabel) {
  if (requester.role === 'Trainer') {
    const trainer = await nutritionRepository.findTrainerByUserId(requester.id);
    if (trainer && trainer.id === assignment.trainer_id) return;
    throw AppError.forbidden(`You may only ${actionLabel} assignments you created`);
  }

  if (requester.role === 'GymOwner' || requester.role === 'SuperAdmin') {
    const assigningTrainer = await trainersRepository.findById(assignment.trainer_id);
    if (assigningTrainer && assigningTrainer.user.account_status === 'Inactive') return;
    throw AppError.forbidden(
      `This assignment's Trainer is active; only they may ${actionLabel} it`
    );
  }

  throw AppError.forbidden();
}

// --- Template (create: Trainer-only; update: owning Trainer or override;
//     deactivate: staff-only, unconditional) --------------------------------

async function createTemplate(input, actingUser) {
  const trainer = await nutritionRepository.findTrainerByUserId(actingUser.id);
  if (!trainer) {
    throw AppError.forbidden('Only Trainers may create nutrition plan templates');
  }

  return nutritionRepository.createTemplate({
    ...input,
    created_by: trainer.id,
    status: 'Active',
  });
}

async function getTemplate(templateId) {
  const template = await nutritionRepository.findTemplateById(templateId);
  if (!template) {
    throw AppError.notFound('Nutrition plan template not found');
  }
  return template;
}

async function listTemplates(query) {
  const where = nutritionRepository.buildTemplateWhere({
    search: query.search,
    goal: query.goal,
    status: query.status,
  });
  const skip = (query.page - 1) * query.limit;
  const { items, total } = await nutritionRepository.listTemplates({ where, skip, take: query.limit });

  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

async function updateTemplate(templateId, updates, requester) {
  const template = await nutritionRepository.findTemplateById(templateId);
  if (!template) {
    throw AppError.notFound('Nutrition plan template not found');
  }
  await assertCanManageTemplate(template, requester);

  if (template.status === 'Inactive' && updates.status !== 'Active') {
    throw AppError.conflict(
      'TEMPLATE_INACTIVE',
      'This template is inactive; reactivate it before making other changes'
    );
  }

  return nutritionRepository.updateTemplate(templateId, updates);
}

async function deactivateTemplate(templateId) {
  const template = await nutritionRepository.findTemplateById(templateId);
  if (!template) {
    throw AppError.notFound('Nutrition plan template not found');
  }
  if (template.status === 'Inactive') {
    throw AppError.conflict('TEMPLATE_ALREADY_INACTIVE', 'This template is already inactive');
  }

  return nutritionRepository.deactivateTemplate(templateId);
}

// --- Assignment (create: Trainer-only, one Active per Member; replace:
//     owning Trainer or override; complete: same; update: same) -----------

async function assignTemplate(input, actingUser) {
  const trainer = await nutritionRepository.findTrainerByUserId(actingUser.id);
  if (!trainer) {
    throw AppError.forbidden('Only Trainers may assign nutrition plan templates');
  }

  const template = await nutritionRepository.findTemplateById(input.nutrition_plan_template_id);
  if (!template) {
    throw AppError.notFound('Nutrition plan template not found');
  }
  if (template.created_by !== trainer.id) {
    throw AppError.forbidden('You may only assign templates you created');
  }
  if (template.status !== 'Active') {
    throw AppError.conflict('TEMPLATE_INACTIVE', 'This template is deactivated and cannot be assigned');
  }

  const member = await nutritionRepository.findMemberById(input.member_id);
  if (!member) {
    throw AppError.notFound('Member not found');
  }
  if (member.current_trainer_id !== trainer.id) {
    throw AppError.forbidden('You may only assign templates to members currently assigned to you');
  }

  const existingActive = await nutritionRepository.findActiveAssignmentByMember(input.member_id);
  if (existingActive) {
    throw AppError.conflict(
      'MEMBER_HAS_ACTIVE_PLAN',
      'This member already has an active nutrition plan assignment; use replace instead'
    );
  }

  return nutritionRepository.createAssignment({
    member_id: input.member_id,
    trainer_id: trainer.id,
    nutrition_plan_template_id: input.nutrition_plan_template_id,
    assigned_date: new Date(),
    start_date: input.start_date,
    assignment_notes: input.assignment_notes,
    status: 'Active',
  });
}

async function getAssignment(assignmentId, requester) {
  const assignment = await nutritionRepository.findAssignmentById(assignmentId);
  if (!assignment) {
    throw AppError.notFound('Assignment not found');
  }

  if (requester.role === 'Trainer') {
    const trainer = await nutritionRepository.findTrainerByUserId(requester.id);
    if (!trainer || trainer.id !== assignment.trainer_id) {
      throw AppError.forbidden('You may only view assignments for members currently assigned to you');
    }
  } else if (requester.role === 'Member') {
    if (assignment.member.user_id !== requester.id) {
      throw AppError.forbidden('You may only view your own assignment');
    }
  }

  return assignment;
}

async function listAssignments(query) {
  const where = nutritionRepository.buildAssignmentWhere({
    member_id: query.member_id,
    trainer_id: query.trainer_id,
    status: query.status,
  });
  const skip = (query.page - 1) * query.limit;
  const { items, total } = await nutritionRepository.listAssignments({ where, skip, take: query.limit });

  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

async function replaceAssignment(assignmentId, input, actingUser) {
  const current = await nutritionRepository.findAssignmentById(assignmentId);
  if (!current) {
    throw AppError.notFound('Assignment not found');
  }
  if (current.status !== 'Active') {
    throw AppError.conflict(
      'ASSIGNMENT_NOT_ACTIVE',
      `An assignment with status ${current.status} cannot be replaced`
    );
  }

  await assertCanActOnAssignment(current, actingUser, 'replace');

  const newTemplate = await nutritionRepository.findTemplateById(input.nutrition_plan_template_id);
  if (!newTemplate) {
    throw AppError.notFound('Nutrition plan template not found');
  }
  if (newTemplate.status !== 'Active') {
    throw AppError.conflict('TEMPLATE_INACTIVE', 'This template is deactivated and cannot be assigned');
  }

  const { created } = await nutritionRepository.replaceAssignment({
    currentAssignmentId: assignmentId,
    newAssignmentData: {
      member_id: current.member_id,
      trainer_id: current.trainer_id,
      nutrition_plan_template_id: input.nutrition_plan_template_id,
      assigned_date: new Date(),
      start_date: input.start_date,
      assignment_notes: input.assignment_notes,
      status: 'Active',
    },
  });

  return created;
}

async function completeAssignment(assignmentId, requester) {
  const assignment = await nutritionRepository.findAssignmentById(assignmentId);
  if (!assignment) {
    throw AppError.notFound('Assignment not found');
  }
  if (assignment.status !== 'Active') {
    throw AppError.conflict(
      'ASSIGNMENT_NOT_ACTIVE',
      `An assignment with status ${assignment.status} cannot be completed`
    );
  }

  await assertCanActOnAssignment(assignment, requester, 'complete');

  return nutritionRepository.completeAssignment(assignmentId);
}

async function updateAssignment(assignmentId, updates, requester) {
  const assignment = await nutritionRepository.findAssignmentById(assignmentId);
  if (!assignment) {
    throw AppError.notFound('Assignment not found');
  }

  await assertCanActOnAssignment(assignment, requester, 'update');

  return nutritionRepository.updateAssignment(assignmentId, updates);
}

async function getMemberActivePlan(memberId, requester) {
  const member = await nutritionRepository.findMemberById(memberId);
  if (!member) {
    throw AppError.notFound('Member not found');
  }

  if (requester.role === 'Trainer') {
    const trainer = await nutritionRepository.findTrainerByUserId(requester.id);
    if (!trainer || member.current_trainer_id !== trainer.id) {
      throw AppError.forbidden('You are not the assigned trainer for this member');
    }
  } else if (requester.role === 'Member') {
    if (member.user_id !== requester.id) {
      throw AppError.forbidden('You may only view your own nutrition plan');
    }
  }

  return nutritionRepository.findMemberActivePlan(memberId);
}

module.exports = {
  createTemplate,
  getTemplate,
  listTemplates,
  updateTemplate,
  deactivateTemplate,
  assignTemplate,
  getAssignment,
  listAssignments,
  replaceAssignment,
  completeAssignment,
  updateAssignment,
  getMemberActivePlan,
};