import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/types/database';

// Integration tests require NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
// and SUPABASE_SERVICE_ROLE_KEY env vars to be set.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const hasEnv = Boolean(supabaseUrl && anonKey && serviceRoleKey);

const admin = hasEnv
  ? createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

const TEST_EMAIL = `test-${Date.now()}@integration.test`;
const TEST_PASSWORD = 'IntegrationPass1!';

const testUserIds: string[] = [];

beforeAll(async () => {
  if (!hasEnv) return;
});

afterAll(async () => {
  if (!admin) return;
  for (const id of testUserIds) {
    await admin.auth.admin.deleteUser(id);
  }
});

describe.skipIf(!hasEnv)('Auth integration', () => {
  it('signup creates a profiles row', async () => {
    const anon = createClient<Database>(supabaseUrl, anonKey);
    const { data, error } = await anon.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    expect(error).toBeNull();
    expect(data.user).toBeTruthy();

    if (data.user) {
      testUserIds.push(data.user.id);

      // Wait for the trigger to fire (small delay for async trigger propagation)
      await new Promise((resolve) => setTimeout(resolve, 500));

      const { data: profile, error: profileError } = await admin!
        .from('profiles')
        .select('id, full_name, notification_email_enabled')
        .eq('id', data.user.id)
        .single();

      expect(profileError).toBeNull();
      expect(profile?.id).toBe(data.user.id);
      expect(profile?.full_name).toBe('');
      expect(profile?.notification_email_enabled).toBe(true);
    }
  });

  it('RLS prevents user B from reading user A profile', async () => {
    // Create two users
    const emailA = `test-a-${Date.now()}@integration.test`;
    const emailB = `test-b-${Date.now()}@integration.test`;

    const { data: dataA } = await admin!.auth.admin.createUser({
      email: emailA,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    const { data: dataB } = await admin!.auth.admin.createUser({
      email: emailB,
      password: TEST_PASSWORD,
      email_confirm: true,
    });

    if (dataA.user) testUserIds.push(dataA.user.id);
    if (dataB.user) testUserIds.push(dataB.user.id);

    // Wait for trigger
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Sign in as user B
    const clientB = createClient<Database>(supabaseUrl, anonKey);
    await clientB.auth.signInWithPassword({ email: emailB, password: TEST_PASSWORD });

    // User B tries to read user A's profile — should get no rows due to RLS
    const { data: profile } = await clientB
      .from('profiles')
      .select('id')
      .eq('id', dataA.user?.id ?? '')
      .maybeSingle();

    expect(profile).toBeNull();
  });
});
