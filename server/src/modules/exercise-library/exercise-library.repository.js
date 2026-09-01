const prisma = require('../../config/db');

/**
 * Exercise Library repository — ONLY database access lives here. No
 * authorization, no business rules. Function names match the
 * "Repository Responsibilities" list from the frozen design exactly,
 * plus one lookup the deactivate-guard needs.
 */

function createExercise(data) {
  return prisma.exerciseLibraryEntry.create({ data });
}

function findExerciseById(id) {
  return prisma.exerciseLibraryEntry.findUnique({ where: { id } });
}

/**
 * Backs the service's "prevent duplicate active exercise names" check —
 * note the schema's @@unique constraint on name is unconditional (not
 * scoped to Active rows only), so this is really just a friendlier
 * pre-check ahead of letting Postgres's own constraint be the final
 * backstop, same relationship members.repository.js's
 * findUserByEmail has to the User.email unique constraint.
 */
function findExerciseByName(name) {
  return prisma.exerciseLibraryEntry.findUnique({ where: { name } });
}

function buildExerciseWhere({ exercise_type, category, status, muscle_group, search }) {
  const where = {};
  const and = [];

  if (exercise_type) and.push({ exercise_type });
  if (category) and.push({ category });
  if (status) and.push({ status });
  if (muscle_group) and.push({ muscle_group: { contains: muscle_group, mode: 'insensitive' } });
  if (search) and.push({ name: { contains: search, mode: 'insensitive' } });

  if (and.length > 0) where.AND = and;
  return where;
}

async function findExercises({ where, skip, take }) {
  const [items, total] = await Promise.all([
    prisma.exerciseLibraryEntry.findMany({
      where,
      skip,
      take,
      orderBy: { name: 'asc' },
    }),
    prisma.exerciseLibraryEntry.count({ where }),
  ]);

  return { items, total };
}

function updateExercise(id, data) {
  return prisma.exerciseLibraryEntry.update({ where: { id }, data });
}

function deactivateExercise(id) {
  return prisma.exerciseLibraryEntry.update({ where: { id }, data: { status: 'Inactive' } });
}

function reactivateExercise(id) {
  return prisma.exerciseLibraryEntry.update({ where: { id }, data: { status: 'Active' } });
}

/**
 * Backs the deactivate-guard: "check whether the exercise is referenced
 * by any active TemplateExercise (through active
 * WorkoutProgramTemplates)." Returns the count rather than the rows
 * themselves — the service only needs to know whether it's zero.
 */
function countActiveTemplateReferences(exerciseLibraryEntryId) {
  return prisma.templateExercise.count({
    where: {
      exercise_library_entry_id: exerciseLibraryEntryId,
      workout_program_session: {
        template: { status: 'Active' },
      },
    },
  });
}

module.exports = {
  createExercise,
  findExerciseById,
  findExerciseByName,
  buildExerciseWhere,
  findExercises,
  updateExercise,
  deactivateExercise,
  reactivateExercise,
  countActiveTemplateReferences,
};