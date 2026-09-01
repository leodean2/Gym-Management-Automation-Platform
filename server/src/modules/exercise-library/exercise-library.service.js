const exerciseLibraryRepository = require('./exercise-library.repository');
const AppError = require('../../lib/AppError');

// Feature 9 — Exercise Library
// All business rules for this module live here. Keep this layer
// framework-agnostic — no req/res here.

// --- Create ----------------------------------------------------------------

/**
 * "Prevent duplicate active exercise names" — in practice this means
 * ANY existing name, active or inactive, since the schema's @@unique
 * constraint on name is unconditional (not scoped to Active rows). An
 * Inactive exercise still occupies its name permanently — reactivating
 * it is the only path back, not creating a new entry with the same name.
 */
async function createExercise(input, actingUser) {
  const existing = await exerciseLibraryRepository.findExerciseByName(input.name);
  if (existing) {
    throw AppError.conflict('EXERCISE_NAME_TAKEN', 'An exercise with this name already exists');
  }

  return exerciseLibraryRepository.createExercise({
    name: input.name,
    description: input.description,
    exercise_type: input.exercise_type,
    category: input.category,
    muscle_group: input.muscle_group,
    status: 'Active',
    created_by: actingUser.id,
  });
}

// --- View --------------------------------------------------------------

async function getExercise(exerciseId) {
  const exercise = await exerciseLibraryRepository.findExerciseById(exerciseId);
  if (!exercise) {
    throw AppError.notFound('Exercise not found');
  }
  return exercise;
}

async function listExercises(query) {
  const where = exerciseLibraryRepository.buildExerciseWhere({
    exercise_type: query.exercise_type,
    category: query.category,
    status: query.status,
    muscle_group: query.muscle_group,
    search: query.search,
  });
  const skip = (query.page - 1) * query.limit;
  const { items, total } = await exerciseLibraryRepository.findExercises({ where, skip, take: query.limit });

  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, total_pages: Math.ceil(total / query.limit) },
  };
}

// --- Update ----------------------------------------------------------------

/**
 * Status is managed exclusively through the dedicated deactivate/
 * reactivate endpoints — never through this one. Deactivation controls
 * availability (can this exercise be selected for new templates/ad-hoc
 * entries), not editability: descriptive metadata (name, description,
 * category, muscle_group) may still be corrected on an Inactive exercise,
 * matching the "deactivation controls availability, not editability"
 * balance applied here. The 'status' in updates check is defensive —
 * updateExerciseSchema is .strict() with no status field, so Zod already
 * rejects it upstream; this just makes the invariant explicit in case
 * the schema ever changes.
 */
async function updateExercise(exerciseId, updates) {
  const exercise = await exerciseLibraryRepository.findExerciseById(exerciseId);
  if (!exercise) {
    throw AppError.notFound('Exercise not found');
  }

  if ('status' in updates) {
    throw AppError.badRequest(
      'STATUS_NOT_EDITABLE',
      'Use the dedicated deactivate/reactivate endpoints to change exercise status'
    );
  }

  if (updates.name && updates.name !== exercise.name) {
    const existing = await exerciseLibraryRepository.findExerciseByName(updates.name);
    if (existing) {
      throw AppError.conflict('EXERCISE_NAME_TAKEN', 'An exercise with this name already exists');
    }
  }

  return exerciseLibraryRepository.updateExercise(exerciseId, updates);
}

// --- Deactivate / Reactivate ------------------------------------------------

/**
 * The one implementation decision carried forward explicitly: before
 * setting status to Inactive, verify the exercise isn't currently
 * referenced by any TemplateExercise belonging to an Active
 * WorkoutProgramTemplate. If it is, reject with 409 rather than silently
 * deactivating out from under live programming — preserves referential
 * integrity for future assignments while leaving historical
 * WorkoutExercise rows (which don't participate in this check at all)
 * completely untouched.
 */
async function deactivateExercise(exerciseId) {
  const exercise = await exerciseLibraryRepository.findExerciseById(exerciseId);
  if (!exercise) {
    throw AppError.notFound('Exercise not found');
  }
  if (exercise.status === 'Inactive') {
    throw AppError.conflict('EXERCISE_ALREADY_INACTIVE', 'This exercise is already inactive');
  }

  const activeReferenceCount = await exerciseLibraryRepository.countActiveTemplateReferences(exerciseId);
  if (activeReferenceCount > 0) {
    throw AppError.conflict(
      'EXERCISE_IN_ACTIVE_USE',
      'This exercise is used by one or more active workout program templates; deactivate or update those templates first'
    );
  }

  return exerciseLibraryRepository.deactivateExercise(exerciseId);
}

/**
 * No equivalent guard on the way back in — restoring availability never
 * conflicts with anything else's state, unlike taking it away.
 */
async function reactivateExercise(exerciseId) {
  const exercise = await exerciseLibraryRepository.findExerciseById(exerciseId);
  if (!exercise) {
    throw AppError.notFound('Exercise not found');
  }
  if (exercise.status === 'Active') {
    throw AppError.conflict('EXERCISE_ALREADY_ACTIVE', 'This exercise is already active');
  }

  return exerciseLibraryRepository.reactivateExercise(exerciseId);
}

module.exports = {
  createExercise,
  getExercise,
  listExercises,
  updateExercise,
  deactivateExercise,
  reactivateExercise,
};