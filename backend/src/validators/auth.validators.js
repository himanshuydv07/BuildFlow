const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

const resetPasswordSchema = z.object({
  uid: z.string().min(1),
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const verifyEmailSchema = z.object({
  uid: z.string().min(1),
  token: z.string().min(1),
});

const deleteAccountSchema = z.object({
  password: z.string().min(1),
});

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  deleteAccountSchema,
};
