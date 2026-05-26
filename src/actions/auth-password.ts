'use server';

import { redirect } from 'next/navigation';

import type { ActionResult } from '@/lib/errors';
import { ErrorCode, makeError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/request';
import { createClient } from '@/lib/supabase/server';
import { forgotPasswordSchema, resetPasswordSchema } from '@/lib/validations/auth';

type EmptyResult = ActionResult<Record<string, never>>;

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
  return { data: {} };
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
