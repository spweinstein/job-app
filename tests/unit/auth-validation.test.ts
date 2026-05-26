import { describe, expect, it } from 'vitest';

import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from '@/lib/validations/auth';

describe('signUpSchema', () => {
  it('accepts a valid email and strong password', () => {
    const result = signUpSchema.safeParse({ email: 'user@example.com', password: 'Password1!' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email format', () => {
    const result = signUpSchema.safeParse({ email: 'not-an-email', password: 'Password1!' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toContain(
        'Please enter a valid email address.',
      );
    }
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = signUpSchema.safeParse({ email: 'user@example.com', password: 'Pass1' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toContain(
        'Password must be at least 8 characters and include a number.',
      );
    }
  });

  it('rejects a password with no digits', () => {
    const result = signUpSchema.safeParse({ email: 'user@example.com', password: 'NoDigitsHere' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toContain(
        'Password must be at least 8 characters and include a number.',
      );
    }
  });

  it('rejects missing email', () => {
    const result = signUpSchema.safeParse({ email: '', password: 'Password1!' });
    expect(result.success).toBe(false);
  });

  it('rejects missing password', () => {
    const result = signUpSchema.safeParse({ email: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('signInSchema', () => {
  it('accepts valid email and password', () => {
    const result = signInSchema.safeParse({ email: 'user@example.com', password: 'anypassword' });
    expect(result.success).toBe(true);
  });

  it('rejects empty email', () => {
    const result = signInSchema.safeParse({ email: '', password: 'anypassword' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toContain(
        'Please enter your email address.',
      );
    }
  });

  it('rejects empty password', () => {
    const result = signInSchema.safeParse({ email: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toContain(
        'Please enter your password.',
      );
    }
  });
});

describe('forgotPasswordSchema', () => {
  it('accepts a valid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email format', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'notanemail' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toContain(
        'Please enter a valid email address.',
      );
    }
  });
});

describe('resetPasswordSchema', () => {
  it('accepts a valid token and strong password', () => {
    const result = resetPasswordSchema.safeParse({
      token_hash: 'abc123',
      password: 'NewPass1!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty token_hash', () => {
    const result = resetPasswordSchema.safeParse({ token_hash: '', password: 'NewPass1!' });
    expect(result.success).toBe(false);
  });

  it('rejects a weak password', () => {
    const result = resetPasswordSchema.safeParse({ token_hash: 'abc123', password: 'weak' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toContain(
        'Password must be at least 8 characters and include a number.',
      );
    }
  });
});
