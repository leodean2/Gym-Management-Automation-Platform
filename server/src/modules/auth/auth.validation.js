const { z } = require('zod');

// FR-1.10: minimum 8 characters. bcrypt handles actual hashing security;
// this is just the app-level policy check before we ever hash anything.
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const requestPasswordResetSchema = z.object({
  email: z.string().email(),
});

const completePasswordResetSchema = z.object({
  token: z.string().min(1),
  new_password: passwordSchema,
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: passwordSchema,
});

module.exports = {
  loginSchema,
  requestPasswordResetSchema,
  completePasswordResetSchema,
  changePasswordSchema,
};
