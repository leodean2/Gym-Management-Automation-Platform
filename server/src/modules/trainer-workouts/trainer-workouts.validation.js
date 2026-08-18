const { z } = require('zod');

const registerTrainerSchema = z
  .object({
    email: z.string().email(),
    first_name: z.string().min(1).max(100),
    last_name: z.string().min(1).max(100),
    phone_number: z.string().min(1).max(20),
    specialization: z.string().min(1).max(150),
    hire_date: z.coerce.date(),
  })
  .strict();

// Union of staff-updatable + self-updatable fields; the service decides
// which subset a given requester may actually set.
const updateTrainerSchema = z
  .object({
    specialization: z.string().min(1).max(150).optional(),
    phone_number: z.string().min(1).max(20).optional(),
    profile_photo_url: z.string().url().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

const assignTrainerSchema = z.object({ trainer_id: z.string().uuid() }).strict();

module.exports = { registerTrainerSchema, updateTrainerSchema, assignTrainerSchema };