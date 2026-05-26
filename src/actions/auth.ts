'use server';

import { redirect } from 'next/navigation';

import type { ActionResult } from '@/lib/errors';
import { ErrorCode, makeError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/request';
import { createClient } from '@/lib/supabase/server';
import { signInSchema, signUpSchema } from '@/lib/validations/auth';

type EmptyResult = ActionResult<Record<string, never>>;

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
