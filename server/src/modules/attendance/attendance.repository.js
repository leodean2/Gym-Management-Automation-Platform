const prisma = require('../../config/db');

function findMemberById(id) {
  return prisma.member.findUnique({ where: { id } });
}

function findTrainerByUserId(userId) {
  return prisma.trainer.findUnique({ where: { user_id: userId } });
}

function findActiveMembershipByMember(memberId) {
  return prisma.membership.findFirst({ where: { member_id: memberId, status: 'Active' } });
}

// Isolated per the plan's note — reused by both check-in and (indirectly)
// history filtering. Only 'Present' counts, per BR-4.2 + void-and-reissue:
// a Voided record never blocks a same-day check-in.
function findTodayPresentAttendance(memberId, dateOnly) {
  return prisma.attendance.findFirst({
    where: { member_id: memberId, attendance_date: dateOnly, status: 'Present' },
  });
}

function createAttendance(data) {
  return prisma.attendance.create({ data });
}

function findAttendanceById(id) {
  return prisma.attendance.findUnique({
    where: { id },
    include: { member: { select: { user_id: true, current_trainer_id: true } } },
  });
}

async function findHistory({ memberId, from, to, skip, take }) {
  // Standard report: excludes Voided records by default (FR-4.8).
  const where = { member_id: memberId, status: 'Present' };
  if (from || to) {
    where.attendance_date = {};
    if (from) where.attendance_date.gte = from;
    if (to) where.attendance_date.lte = to;
  }

  const [items, total] = await Promise.all([
    prisma.attendance.findMany({ where, skip, take, orderBy: { attendance_date: 'desc' } }),
    prisma.attendance.count({ where }),
  ]);

  return { items, total };
}

/**
 * Void-and-reissue, atomically. replacementData is null when the
 * correction doesn't require a replacement (a true duplicate being voided
 * outright).
 */
function voidAndReplace(originalId, reason, replacementData) {
  return prisma.$transaction(async (tx) => {
    const voided = await tx.attendance.update({
      where: { id: originalId },
      data: { status: 'Voided', correction_reason: reason },
    });

    let replacement = null;
    if (replacementData) {
      replacement = await tx.attendance.create({
        data: { ...replacementData, replaces_attendance_id: originalId },
      });
    }

    return { voided, replacement };
  });
}

module.exports = {
  findMemberById,
  findTrainerByUserId,
  findActiveMembershipByMember,
  findTodayPresentAttendance,
  createAttendance,
  findAttendanceById,
  findHistory,
  voidAndReplace,
};
