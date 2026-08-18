const prisma = require('../../config/db');

/**
 * Trainers repository — ONLY database access lives here. No authorization,
 * no business rules, no validation. Every function is a thin, named wrapper
 * around a Prisma call so the service layer reads like a description of the
 * business process, not a series of raw queries.
 */

// --- User-side helpers (needed for atomic registration) --------------------

function findUserByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

// --- Trainer CRUD ------------------------------------------------------------

/**
 * Creates the User (auth identity) and Trainer (profile) rows in a single
 * transaction, mirroring FR-2.1's atomic member registration — a Trainer is
 * never left "half created."
 */
function createTrainerWithUser({ userData, trainerData }) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: userData });
    const trainer = await tx.trainer.create({
      data: { ...trainerData, user_id: user.id },
    });
    return { user, trainer };
  });
}

function findById(trainerId) {
  return prisma.trainer.findUnique({
    where: { id: trainerId },
    include: { user: { select: { email: true, account_status: true } } },
  });
}

function findByUserId(userId) {
  return prisma.trainer.findUnique({ where: { user_id: userId } });
}

function countCreatedBetween(start, end) {
  return prisma.trainer.count({
    where: { created_at: { gte: start, lt: end } },
  });
}

function updateTrainer(trainerId, data) {
  return prisma.trainer.update({ where: { id: trainerId }, data });
}

// --- Trainer Assignment (FR-5.x) --------------------------------------------

/**
 * Needed to validate the target member exists before assigning a trainer to
 * them, and to read their current_trainer_id as the assignment's "previous
 * trainer." Kept as a thin, module-local wrapper rather than importing
 * members.repository.js, mirroring the boundary members.repository.js
 * itself documents for the reverse case (its own findTrainerByUserId).
 */
function findMemberById(memberId) {
  return prisma.member.findUnique({ where: { id: memberId } });
}

/**
 * Atomically updates the Member's current_trainer_id and records the change
 * in TrainerAssignmentHistory, so an assignment is never left partially
 * applied. historyData is assembled by the service layer (previous/new
 * trainer, who reassigned, when, why) — this function only executes the
 * writes.
 */
function assignTrainerToMember({ memberId, newTrainerId, historyData }) {
  return prisma.$transaction(async (tx) => {
    const member = await tx.member.update({
      where: { id: memberId },
      data: { current_trainer_id: newTrainerId },
    });

    const history = await tx.trainerAssignmentHistory.create({
      data: historyData,
    });

    return { member, history };
  });
}

function findAssignmentHistoryByMember(memberId) {
  return prisma.trainerAssignmentHistory.findMany({
    where: { member_id: memberId },
    orderBy: { reassigned_at: 'desc' },
  });
}

module.exports = {
  findUserByEmail,
  createTrainerWithUser,
  findById,
  findByUserId,
  countCreatedBetween,
  updateTrainer,
  findMemberById,
  assignTrainerToMember,
  findAssignmentHistoryByMember,
};