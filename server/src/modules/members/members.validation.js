const { z } = require('zod');

// FR-2.1 — required fields for registration.
const registerMemberSchema = z
  .object({
    email: z.string().email(),
    first_name: z.string().min(1).max(100),
    last_name: z.string().min(1).max(100),
    phone_number: z.string().min(1).max(20),
    date_of_birth: z.coerce.date(),
    gender: z.enum(['Male', 'Female', 'Other']),
    emergency_contact_name: z.string().min(1).max(150),
    emergency_contact_phone: z.string().min(1).max(20),
    address: z.string().optional(),
    medical_notes: z.string().optional(),
  })
  .strict();

// FR-2.4 — only contact/operational fields are editable here.
// .strict() rejects membership_number / created_by / user_id outright
// rather than silently ignoring them, so a client attempting to set an
// immutable field gets a clear 400, not silent no-op behavior.
const updateMemberSchema = z
  .object({
    phone_number: z.string().min(1).max(20).optional(),
    address: z.string().optional(),
    emergency_contact_name: z.string().min(1).max(150).optional(),
    emergency_contact_phone: z.string().min(1).max(20).optional(),
    medical_notes: z.string().optional(),
    profile_photo_url: z.string().url().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

// FR-2.6 — search/filter query params.
const searchMemberSchema = z.object({
  name: z.string().optional(),
  membership_number: z.string().optional(),
  phone: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = { registerMemberSchema, updateMemberSchema, searchMemberSchema };
