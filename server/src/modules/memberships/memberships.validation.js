const { z } = require('zod');

// FR-3.1 — description is optional per the frozen schema (NULLABLE),
// even though the FR's prose lists it alongside required fields; the
// authoritative shape is the reconciled Prisma schema.
const createMembershipPlanSchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    duration_days: z.coerce.number().int().positive(),
    price: z.coerce.number().positive(),
  })
  .strict();

// FR-3.3 — created_by/created_at are immutable, deliberately excluded.
const updateMembershipPlanSchema = z
  .object({
    description: z.string().optional(),
    duration_days: z.coerce.number().int().positive().optional(),
    price: z.coerce.number().positive().optional(),
    is_active: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

const listPlansQuerySchema = z.object({
  status: z.enum(['active', 'inactive', 'all']).default('active'),
  search: z.string().optional(),
});

// FR-3.2 — payment_method is intentionally NOT accepted here. This module
// only ever creates a Pending Membership + Pending Invoice; recording a
// payment (and the method used) belongs exclusively to the Payments module.
const createMembershipSchema = z
  .object({
    member_id: z.string().uuid(),
    membership_plan_id: z.string().uuid(),
  })
  .strict();

// membership_plan_id is optional — omit to renew into the same plan,
// provide a different plan id to upgrade/downgrade on renewal.
const renewMembershipSchema = z
  .object({
    membership_plan_id: z.string().uuid().optional(),
  })
  .strict();

// FR-3.6 — a reason is required for every suspension.
const suspendMembershipSchema = z
  .object({
    reason: z.string().min(1),
  })
  .strict();

module.exports = {
  createMembershipPlanSchema,
  updateMembershipPlanSchema,
  listPlansQuerySchema,
  createMembershipSchema,
  renewMembershipSchema,
  suspendMembershipSchema,
};
