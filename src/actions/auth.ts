'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import type { ActionResult } from '@/lib/errors';
import { ErrorCode, makeError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from '@/lib/validations/auth';

type EmptyResult = ActionResult<Record<string, never>>;

async function getClientIp(): Promise<string> {
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() ?? '127.0.0.1';
}

export async function signUp(_prevState: EmptyResult | null, formData: FormData): Promise<EmptyResult> {
  const raw = { email: formData.get('email'), password: formData.get('password') };
  const parsed = signUpSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      error: makeError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid input.',
        parsed.error.flatten().fieldErrors,
      ),
    };
  }

  const ip = await getClientIp();
  const allowed = await checkRateLimit('signup', ip);
  if (!allowed) {
    return { error: makeError(ErrorCode.RATE_LIMITED, 'Too many signup attempts. Please try again later.') };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (
      error.message.toLowerCase().includes('already registered') ||
      error.code === 'user_already_exists'
    ) {
      return { error: makeError(ErrorCode.CONFLICT, 'An account with this email already exists.') };
    }
    logger.error('Signup error', { error: { message: error.message, code: error.code } });
    return { error: makeError(ErrorCode.INTERNAL_ERROR, 'An error occurred. Please try again.') };
  }

  return { data: {} };
}

export async function signIn(_prevState: EmptyResult | null, formData: FormData): Promise<EmptyResult> {
  const raw = { email: formData.get('email'), password: formData.get('password') };
  const parsed = signInSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      error: makeError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid input.',
        parsed.error.flatten().fieldErrors,
      ),
    };
  }

  const ip = await getClientIp();
  const allowed = await checkRateLimit('login', ip);
  if (!allowed) {
    return { error: makeError(ErrorCode.RATE_LIMITED, 'Too many login attempts. Please try again later.') };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: makeError(ErrorCode.UNAUTHENTICATED, 'Invalid email or password.') };
  }

  const rawRedirect = formData.get('redirectTo');
  const redirectTo =
    typeof rawRedirect === 'string' && rawRedirect.startsWith('/') ? rawRedirect : '/dashboard';

  redirect(redirectTo);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function sendPasswordResetEmail(
  _prevState: EmptyResult | null,
  formData: FormData,
): Promise<EmptyResult> {
  const raw = { email: formData.get('email') };
  const parsed = forgotPasswordSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      error: makeError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid input.',
        parsed.error.flatten().fieldErrors,
      ),
    };
  }

  const ip = await getClientIp();
  const allowed = await checkRateLimit('forgotPassword', ip);
  if (!allowed) {
    return { error: makeError(ErrorCode.RATE_LIMITED, 'Too many requests. Please try again later.') };
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/reset-password`,
  });

  // Always return the same message to prevent email enumeration
  return {
    data: {},
  };
}

export async function resetPassword(
  _prevState: EmptyResult | null,
  formData: FormData,
): Promise<EmptyResult> {
  const raw = { token_hash: formData.get('token_hash'), password: formData.get('password') };
  const parsed = resetPasswordSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      error: makeError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid input.',
        parsed.error.flatten().fieldErrors,
      ),
    };
  }

  const supabase = await createClient();

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: parsed.data.token_hash,
    type: 'recovery',
  });

  if (verifyError) {
    return {
      error: makeError(
        ErrorCode.VALIDATION_ERROR,
        'This reset link has expired. Request a new one.',
      ),
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (updateError) {
    logger.error('Password update error', { error: { message: updateError.message } });
    return { error: makeError(ErrorCode.INTERNAL_ERROR, 'Failed to update password. Please try again.') };
  }

  await supabase.auth.signOut();
  redirect('/login?reset=success');
}
