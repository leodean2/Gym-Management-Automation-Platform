const workoutProgramsRepository = require('./workout-programs.repository');
const trainersRepository = require('./trainers.repository'); // reused for the "creating Trainer is Inactive" check
const AppError = require('../../lib/AppError');

// --- Ownership / override helpers -------------------------------------

/**
 * FR-5.6: only the creating Trainer may manage a template's structure
 * (the template itself, its sessions, its exercises). If that Trainer is
 * Inactive, the Gym Owner may manage it instead — the same override
 * pattern used throughout this schema (workout session reopen, booking
 * reopen, trainer reassignment).
 */
async function assertCanManageTemplate(template, requester) {
  if (requester.role === 'Trainer') {
    const trainer = await workoutProgramsRepository.findTrainerByUserId(requester.id);
    if (trainer && trainer.id === template.created_by) return;
    throw AppError.forbidden('You may only manage workout program templates you created');
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

/**
 * FR-5.9: the assigning Trainer may mark an assignment Completed; if that
 * Trainer is Inactive, the Gym Owner may do so instead.
 */
async function assertCanCompleteAssignment(assignment, requester) {
  if (requester.role === 'Trainer') {
    const trainer = await workoutProgramsRepository.findTrainerByUserId(requester.id);
    if (trainer && trainer.id === assignment.trainer_id) return;
    throw AppError.forbidden('You may only complete assignments you created');
  }

  if (requester.role === 'GymOwner' || requester.role === 'SuperAdmin') {
    const assigningTrainer = await trainersRepository.findById(assignment.trainer_id);
    if (assigningTrainer && assigningTrainer.user.account_status === 'Inactive') return;
    throw AppError.forbidden(
      'This assignment\'s Trainer is active; only they may complete it'
    );
  }

  throw AppError.forbidden();
}

// --- Template (FR-5.5 / FR-5.6 / FR-5.7) ------------------------------------

/**
 * Trainer-only, deriving ownership from the requester rather than
 * accepting a trainer_id in the body — a Trainer can only ever create a
 * template as themselves. No Inactive-Trainer override applies here:
 * there's no existing template/owner yet for the override to act on.
 */
async function createTemplate(input, actingUser) {
  const trainer = await workoutProgramsRepository.findTrainerByUserId(actingUser.id);
  if (!trainer) {
    throw AppError.forbidden('Only Trainers may create workout program templates');
  }

  return workoutProgramsRepository.createTemplate({
    ...input,
    created_by: trainer.id,
    status: 'Active',
  });
}

async function getTemplate(templateId) {
  const template = await workoutProgramsRepository.findTemplateById(templateId);
  if (!template) {
    throw AppError.notFound('Workout program template not found');
  }
  return template;
}

async function listTemplates(query, requester) {
  let trainerId;
  if (query.mine === 'true' && requester.role === 'Trainer') {
    const trainer = await workoutProgramsRepository.findTrainerByUserId(requester.id);
    trainerId = trainer?.id;
  }
  return workoutProgramsRepository.listTemplates({ status: query.status, trainerId });
}

async function updateTemplate(templateId, updates, requester) {
  const template = await workoutProgramsRepository.findTemplateById(templateId);
  if (!template) {
    throw AppError.notFound('Workout program template not found');
  }
  await assertCanManageTemplate(template, requester);
  return workoutProgramsRepository.updateTemplate(templateId, updates);
}

// --- Session -----------------------------------------------------------

async function createSession(templateId, input, requester) {
  const template = await workoutProgramsRepository.findTemplateById(templateId);
  if (!template) {
    throw AppError.notFound('Workout program template not found');
  }
  await assertCanManageTemplate(template, requester);
  return workoutProgramsRepository.createSession(templateId, input);
}

async function updateSession(sessionId, updates, requester) {
  const session = await workoutProgramsRepository.findSessionById(sessionId);
  if (!session) {
    throw AppError.notFound('Session not found');
  }
  await assertCanManageTemplate(session.template, requester);
  return workoutProgramsRepository.updateSession(sessionId, updates);
}

// --- Template Exercise (FR-9.1: only Active library entries) ---------------

async function createExercise(sessionId, input, requester) {
  const session = await workoutProgramsRepository.findSessionById(sessionId);
  if (!session) {
    throw AppError.notFound('Session not found');
  }
  await assertCanManageTemplate(session.template, requester);

  const exerciseEntry = await workoutProgramsRepository.findExerciseLibraryEntryById(
    input.exercise_library_entry_id
  );
  if (!exerciseEntry) {
    throw AppError.notFound('Exercise library entry not found');
  }
  if (exerciseEntry.status !== 'Active') {
    throw AppError.conflict('EXERCISE_INACTIVE', 'This exercise is not currently active');
  }

  return workoutProgramsRepository.createExercise(sessionId, input);
}

async function updateExercise(exerciseId, updates, requester) {
  const exercise = await workoutProgramsRepository.findExerciseById(exerciseId);
  if (!exercise) {
    throw AppError.notFound('Template exercise not found');
  }
  await assertCanManageTemplate(exercise.workout_program_session.template, requester);

  if (updates.exercise_library_entry_id) {
    const exerciseEntry = await workoutProgramsRepository.findExerciseLibraryEntryById(
      updates.exercise_library_entry_id
    );
    if (!exerciseEntry) {
      throw AppError.notFound('Exercise library entry not found');
    }
    if (exerciseEntry.status !== 'Active') {
      throw AppError.conflict('EXERCISE_INACTIVE', 'This exercise is not currently active');
    }
  }

  return workoutProgramsRepository.updateExercise(exerciseId, updates);
}

// --- Assignment (FR-5.8) -----------------------------------------------

/**
 * Trainer-only, and only for their own templates + their own members —
 * no Inactive-Trainer override here, matching FR-5.8's business rules
 * exactly (unlike editing a template, assigning a *new* program isn't
 * something the frozen FRs hand off to the Gym Owner).
 */
async function assignTemplate(templateId, input, actingUser) {
  const trainer = await workoutProgramsRepository.findTrainerByUserId(actingUser.id);
  if (!trainer) {
    throw AppError.forbidden('Only Trainers may assign workout program templates');
  }

  const template = await workoutProgramsRepository.findTemplateById(templateId);
  if (!template) {
    throw AppError.notFound('Workout program template not found');
  }
  if (template.created_by !== trainer.id) {
    throw AppError.forbidden('You may only assign templates you created');
  }
  if (template.status !== 'Active') {
    throw AppError.conflict('TEMPLATE_INACTIVE', 'This template is deactivated and cannot be assigned');
  }

  const member = await workoutProgramsRepository.findMemberById(input.member_id);
  if (!member) {
    throw AppError.notFound('Member not found');
  }
  if (member.current_trainer_id !== trainer.id) {
    throw AppError.forbidden('You may only assign templates to members currently assigned to you');
  }

  return workoutProgramsRepository.createAssignment({
    member_id: input.member_id,
    trainer_id: trainer.id,
    workout_program_template_id: templateId,
    assigned_date: new Date(),
    start_date: input.start_date,
    assignment_notes: input.assignment_notes,
    status: 'Active',
  });
}

async function completeAssignment(assignmentId, requester) {
  const assignment = await workoutProgramsRepository.findAssignmentById(assignmentId);
  if (!assignment) {
    throw AppError.notFound('Assignment not found');
  }
  if (assignment.status !== 'Active') {
    throw AppError.conflict(
      'ASSIGNMENT_NOT_ACTIVE',
      `An assignment with status ${assignment.status} cannot be completed`
    );
  }

  await assertCanCompleteAssignment(assignment, requester);

  return workoutProgramsRepository.updateAssignment(assignmentId, {
    status: 'Completed',
    completion_date: new Date(),
  });
}

async function getMemberAssignments(memberId, requester) {
  const member = await workoutProgramsRepository.findMemberById(memberId);
  if (!member) {
    throw AppError.notFound('Member not found');
  }

  if (requester.role === 'Trainer') {
    const trainer = await workoutProgramsRepository.findTrainerByUserId(requester.id);
    if (!trainer || member.current_trainer_id !== trainer.id) {
      throw AppError.forbidden('You are not the assigned trainer for this member');
    }
  } else if (requester.role === 'Member') {
    if (member.user_id !== requester.id) {
      throw AppError.forbidden('You may only view your own workout program assignments');
    }
  }

  return workoutProgramsRepository.findAssignmentsByMember(memberId);
}

module.exports = {
  createTemplate,
  getTemplate,
  listTemplates,
  updateTemplate,
  createSession,
  updateSession,
  createExercise,
  updateExercise,
  assignTemplate,
  completeAssignment,
  getMemberAssignments,
};