import { z } from 'zod';

const PASSWORD_MESSAGE = 'Password must be at least 8 characters and include a number.';

const passwordSchema = z.string().min(8, PASSWORD_MESSAGE).regex(/\d/, PASSWORD_MESSAGE);

export const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: z.string().min(1, 'Please enter your email address.'),
  password: z.string().min(1, 'Please enter your password.'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});

export const resetPasswordSchema = z.object({
  token_hash: z.string().min(1, 'Invalid reset token.'),
  password: passwordSchema,
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
