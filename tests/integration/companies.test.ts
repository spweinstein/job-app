/**
 * Integration tests for companies server actions.
 *
 * Prerequisites: local Supabase stack running (`supabase start`).
 * These tests use the SUPABASE_TEST_URL and SUPABASE_TEST_ANON_KEY env vars
 * and create/tear down their own test data.
 *
 * Run: pnpm test:integration
 */

import { createClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Database } from '@/types/database';

const supabaseUrl = process.env['SUPABASE_TEST_URL'] ?? 'http://localhost:54321';
const supabaseAnonKey = process.env['SUPABASE_TEST_ANON_KEY'] ?? '';
const serviceRoleKey = process.env['SUPABASE_TEST_SERVICE_ROLE_KEY'] ?? '';

const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function signUpTestUser(email: string, password: string) {
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user;
}

async function signInTestUser(email: string, password: string) {
  const client = createClient<Database>(supabaseUrl, supabaseAnonKey);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { client, session: data.session };
}

async function deleteTestUser(userId: string) {
  await adminClient.auth.admin.deleteUser(userId);
}

describe('companies integration', () => {
  const userAEmail = `test-a-${Date.now()}@example.com`;
  const userBEmail = `test-b-${Date.now()}@example.com`;
  const password = 'TestPassword123!';
  let userAId = '';
  let userBId = '';

  beforeEach(async () => {
    const userA = await signUpTestUser(userAEmail, password);
    const userB = await signUpTestUser(userBEmail, password);
    userAId = userA.id;
    userBId = userB.id;
  });

  afterEach(async () => {
    if (userAId) await deleteTestUser(userAId);
    if (userBId) await deleteTestUser(userBId);
  });

  it('user A can create and read their own company', async () => {
    const { client: clientA } = await signInTestUser(userAEmail, password);

    const { data: inserted, error: insertError } = await clientA
      .from('companies')
      .insert({ user_id: userAId, name: 'Acme Corp' })
      .select('id, name, user_id')
      .single();

    expect(insertError).toBeNull();
    expect(inserted?.name).toBe('Acme Corp');
    expect(inserted?.user_id).toBe(userAId);

    const { data: read } = await clientA
      .from('companies')
      .select('id, name')
      .eq('id', inserted!.id)
      .single();

    expect(read?.name).toBe('Acme Corp');
  });

  it('user A can update their own company', async () => {
    const { client: clientA } = await signInTestUser(userAEmail, password);

    const { data: inserted } = await clientA
      .from('companies')
      .insert({ user_id: userAId, name: 'Old Name' })
      .select('id')
      .single();

    const { error } = await clientA
      .from('companies')
      .update({ name: 'New Name' })
      .eq('id', inserted!.id);

    expect(error).toBeNull();

    const { data: updated } = await clientA
      .from('companies')
      .select('name')
      .eq('id', inserted!.id)
      .single();

    expect(updated?.name).toBe('New Name');
  });

  it('user A can delete their own company', async () => {
    const { client: clientA } = await signInTestUser(userAEmail, password);

    const { data: inserted } = await clientA
      .from('companies')
      .insert({ user_id: userAId, name: 'To Delete' })
      .select('id')
      .single();

    const { error } = await clientA
      .from('companies')
      .delete()
      .eq('id', inserted!.id);

    expect(error).toBeNull();

    const { data: gone } = await clientA
      .from('companies')
      .select('id')
      .eq('id', inserted!.id)
      .single();

    expect(gone).toBeNull();
  });

  it('user B cannot read user A company via RLS', async () => {
    const { client: clientA } = await signInTestUser(userAEmail, password);
    const { client: clientB } = await signInTestUser(userBEmail, password);

    const { data: inserted } = await clientA
      .from('companies')
      .insert({ user_id: userAId, name: 'Private Corp' })
      .select('id')
      .single();

    const { data: readByB } = await clientB
      .from('companies')
      .select('id, name')
      .eq('id', inserted!.id)
      .single();

    expect(readByB).toBeNull();
  });

  it('user B cannot update user A company via RLS', async () => {
    const { client: clientA } = await signInTestUser(userAEmail, password);
    const { client: clientB } = await signInTestUser(userBEmail, password);

    const { data: inserted } = await clientA
      .from('companies')
      .insert({ user_id: userAId, name: 'Secure Corp' })
      .select('id')
      .single();

    const { error } = await clientB
      .from('companies')
      .update({ name: 'Hacked' })
      .eq('id', inserted!.id);

    // RLS causes update to affect 0 rows — no error but also no change
    expect(error).toBeNull();

    const { data: unchanged } = await clientA
      .from('companies')
      .select('name')
      .eq('id', inserted!.id)
      .single();

    expect(unchanged?.name).toBe('Secure Corp');
  });
});
