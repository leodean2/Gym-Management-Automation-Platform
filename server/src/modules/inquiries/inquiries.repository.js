const prisma = require('../../config/db');

/**
 * Inquiries repository — ONLY database access lives here. No
 * authorization, no business rules.
 */

// --- Helper needed for the link-member check in the service ---------------

function findMemberById(id) {
  return prisma.member.findUnique({ where: { id } });
}

// --- Inquiry -----------------------------------------------------------

function createInquiry(data) {
  return prisma.inquiry.create({ data });
}

function findInquiryById(id) {
  return prisma.inquiry.findUnique({
    where: { id },
    include: {
      linked_member: { select: { id: true, first_name: true, last_name: true } },
      _count: { select: { follow_up_notes: true } },
    },
  });
}

function buildInquiryWhere({ status, outcome, search, from, to }) {
  const where = {};
  const and = [];

  if (status) and.push({ status });
  if (outcome) and.push({ outcome });
  if (search) {
    and.push({
      OR: [
        { full_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone_number: { contains: search, mode: 'insensitive' } },
      ],
    });
  }
  if (from || to) {
    const createdAt = {};
    if (from) createdAt.gte = from;
    if (to) createdAt.lte = to;
    and.push({ created_at: createdAt });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

async function findInquiries({ where, skip, take }) {
  const [items, total] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
    }),
    prisma.inquiry.count({ where }),
  ]);

  return { items, total };
}

/**
 * PATCH /:id — status and/or outcome, per whatever the service has
 * already validated. Also used for the link-member write (setting
 * linked_member_id), reusing this same generic updater rather than a
 * separate function, since it's a single-field update with no special
 * transactional needs of its own (unlike Payments' void-and-reissue
 * chains).
 */
function updateInquiry(id, data) {
  return prisma.inquiry.update({ where: { id }, data });
}

// --- Follow-up Notes (append-only) ------------------------------------------

function createFollowUpNote(data) {
  return prisma.inquiryFollowUpNote.create({ data });
}

function findFollowUpNotesByInquiry(inquiryId) {
  return prisma.inquiryFollowUpNote.findMany({
    where: { inquiry_id: inquiryId },
    include: { created_by_user: { select: { email: true } } },
    orderBy: { created_at: 'asc' },
  });
}

module.exports = {
  findMemberById,
  createInquiry,
  findInquiryById,
  buildInquiryWhere,
  findInquiries,
  updateInquiry,
  createFollowUpNote,
  findFollowUpNotesByInquiry,
};