const prisma = require('../../config/db');

/**
 * Members repository — ONLY database access lives here. No authorization,
 * no business rules, no validation. Every function is a thin, named wrapper
 * around a Prisma call so the service layer reads like a description of the
 * business process, not a series of raw queries.
 */

// --- User-side helpers (needed for atomic registration) -------------------

function findUserByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

/**
 * Needed for authorization: a Trainer's User.id must be resolved to their
 * Trainer.id before we can check it against Member.current_trainer_id
 * (that FK points at Trainer, not User). Lives here rather than in a
 * separate trainers repository since it's only ever used for this module's
 * own permission checks — if the future trainer-workouts module needs
 * richer Trainer queries, build a proper trainers.repository.js there and
 * this can be removed in favor of that.
 */
function findTrainerByUserId(userId) {
  return prisma.trainer.findUnique({ where: { user_id: userId } });
}

// --- Member CRUD ------------------------------------------------------------

/**
 * Creates the User (auth identity) and Member (profile) rows in a single
 * transaction, per FR-2.1 — a Member is never left "half created."
 */
function createMemberWithUser({ userData, memberData }) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: userData });
    const member = await tx.member.create({
      data: { ...memberData, user_id: user.id },
    });
    return { user, member };
  });
}

function findById(memberId) {
  return prisma.member.findUnique({
    where: { id: memberId },
    include: { user: { select: { email: true, account_status: true } } },
  });
}

function findByUserId(userId) {
  return prisma.member.findUnique({ where: { user_id: userId } });
}

function countCreatedBetween(start, end) {
  return prisma.member.count({
    where: { created_at: { gte: start, lt: end } },
  });
}

/**
 * Builds the Prisma `where` clause dynamically from whichever filters were
 * actually supplied, instead of a long chain of if-statements duplicated
 * between the count and findMany calls.
 */
function buildSearchWhere({ name, membership_number, phone, trainerScope }) {
  const where = {};
  const and = [];

  if (name) {
    and.push({
      OR: [
        { first_name: { contains: name, mode: 'insensitive' } },
        { last_name: { contains: name, mode: 'insensitive' } },
      ],
    });
  }

  if (membership_number) {
    and.push({ membership_number: { contains: membership_number, mode: 'insensitive' } });
  }

  if (phone) {
    and.push({ phone_number: { contains: phone } });
  }

  // FR-5.4: a Trainer's search results are scoped to their assigned
  // members only — enforced here as an additional AND clause, not by
  // filtering results after the fact.
  if (trainerScope) {
    and.push({ current_trainer_id: trainerScope });
  }

  if (and.length > 0) {
    where.AND = and;
  }

  return where;
}

async function searchMembers({ where, skip, take }) {
  const [items, total] = await Promise.all([
    prisma.member.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        membership_number: true,
        first_name: true,
        last_name: true,
        phone_number: true,
        current_trainer_id: true,
        created_at: true,
      },
    }),
    prisma.member.count({ where }),
  ]);

  return { items, total };
}

function updateMember(memberId, data) {
  return prisma.member.update({ where: { id: memberId }, data });
}

module.exports = {
  findUserByEmail,
  findTrainerByUserId,
  createMemberWithUser,
  findById,
  findByUserId,
  countCreatedBetween,
  buildSearchWhere,
  searchMembers,
  updateMember,
};
