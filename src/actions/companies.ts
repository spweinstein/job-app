'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { type ActionResult, ErrorCode, makeError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import { createCompanySchema, updateCompanySchema } from '@/lib/validations/companies';

export async function createCompany(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createCompanySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      error: makeError(ErrorCode.VALIDATION_ERROR, 'Invalid input.', parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError ?? !user) {
    return { error: makeError(ErrorCode.UNAUTHENTICATED, 'You must be signed in.') };
  }

  const { data, error } = await supabase
    .from('companies')
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      website: parsed.data.website,
      notes: parsed.data.notes,
    })
    .select('id')
    .single();

  if (error) {
    logger.error('createCompany failed', { action: 'createCompany', error: { message: error.message, code: error.code } });
    return { error: makeError(ErrorCode.INTERNAL_ERROR, 'Failed to create company.') };
  }

  revalidatePath('/companies');
  return { data: { id: data.id } };
}

export async function updateCompany(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = updateCompanySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      error: makeError(ErrorCode.VALIDATION_ERROR, 'Invalid input.', parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError ?? !user) {
    return { error: makeError(ErrorCode.UNAUTHENTICATED, 'You must be signed in.') };
  }

  const { data, error } = await supabase
    .from('companies')
    .update({
      name: parsed.data.name,
      website: parsed.data.website,
      notes: parsed.data.notes,
    })
    .eq('id', parsed.data.id)
    .eq('user_id', user.id)
    .select('id')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { error: makeError(ErrorCode.FORBIDDEN, 'Company not found or access denied.') };
    }
    logger.error('updateCompany failed', { action: 'updateCompany', error: { message: error.message, code: error.code } });
    return { error: makeError(ErrorCode.INTERNAL_ERROR, 'Failed to update company.') };
  }

  revalidatePath(`/companies/${data.id}`);
  revalidatePath('/companies');
  return { data: { id: data.id } };
}

export async function deleteCompany(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(rawInput);
  if (!parsed.success) {
    return {
      error: makeError(ErrorCode.VALIDATION_ERROR, 'Invalid input.', parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError ?? !user) {
    return { error: makeError(ErrorCode.UNAUTHENTICATED, 'You must be signed in.') };
  }

  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', parsed.data.id)
    .eq('user_id', user.id);

  if (error) {
    logger.error('deleteCompany failed', { action: 'deleteCompany', error: { message: error.message, code: error.code } });
    return { error: makeError(ErrorCode.INTERNAL_ERROR, 'Failed to delete company.') };
  }

  revalidatePath('/companies');
  return { data: { id: parsed.data.id } };
}
