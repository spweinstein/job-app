import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

const TEST_EMAIL = `e2e-${Date.now()}@test.local`;
const TEST_PASSWORD = 'E2ePassword1!';
const NEW_PASSWORD = 'NewE2ePassword1!';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const hasAdminAccess = Boolean(supabaseUrl && serviceRoleKey);

function makeAdmin() {
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

test.describe('Signup', () => {
  test('successful signup shows confirmation message', async ({ page }) => {
    await page.goto('/signup');
    await page.getByLabel('Email').fill(TEST_EMAIL);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Check your email to confirm your account.')).toBeVisible();
  });

  test('weak password shows validation error without server request', async ({ page }) => {
    await page.goto('/signup');
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('abc');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(
      page.getByText('Password must be at least 8 characters and include a number.'),
    ).toBeVisible();
  });

  test('duplicate email shows server error', async ({ page }) => {
    const dupEmail = `dup-${Date.now()}@test.local`;
    await page.goto('/signup');
    await page.getByLabel('Email').fill(dupEmail);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Check your email to confirm your account.')).toBeVisible();

    await page.goto('/signup');
    await page.getByLabel('Email').fill(dupEmail);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(
      page.getByText('An account with this email already exists.'),
    ).toBeVisible();
  });
});

test.describe('Login', () => {
  test('wrong password shows error and no session', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('WrongPassword1!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Invalid email or password.')).toBeVisible();
  });

  test('redirect preservation: unauthenticated visit to protected route redirects to login', async ({
    page,
  }) => {
    const response = await page.goto('/dashboard');
    expect(page.url()).toContain('/login');
    expect(page.url()).toContain('redirect=');
    expect(response?.status()).not.toBe(500);
  });
});

test.describe('Forgot Password', () => {
  test('valid email shows success message (prevents enumeration)', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(
      page.getByText('If that email is registered, you will receive a reset link.'),
    ).toBeVisible();
  });

  test('unknown email shows same success message', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel('Email').fill('nobody@example.com');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(
      page.getByText('If that email is registered, you will receive a reset link.'),
    ).toBeVisible();
  });
});

test.describe('Reset Password', () => {
  test('page without token_hash shows expired message', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.getByText('This reset link has expired. Request a new one.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Request a new reset link' })).toBeVisible();
  });

  test('mismatched passwords shows client-side error', async ({ page }) => {
    await page.goto('/reset-password?token_hash=fake-token&type=recovery');
    await page.getByLabel('New password').fill('NewPass1!');
    await page.getByLabel('Confirm password').fill('DifferentPass1!');
    await page.getByRole('button', { name: 'Reset password' }).click();
    await expect(page.getByText('Passwords do not match.')).toBeVisible();
  });

  test('expired token_hash shows error with link to forgot-password', async ({ page }) => {
    await page.goto('/reset-password?token_hash=expired-invalid-token&type=recovery');
    await page.getByLabel('New password').fill(NEW_PASSWORD);
    await page.getByLabel('Confirm password').fill(NEW_PASSWORD);
    await page.getByRole('button', { name: 'Reset password' }).click();
    await expect(page.getByText('This reset link has expired. Request a new one.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Request a new reset link' })).toBeVisible();
  });
});

test.describe('Middleware auth guard', () => {
  test('unauthenticated request to /dashboard redirects to /login?redirect=/dashboard', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/);
  });
});

// --- Tests requiring a confirmed user (need SUPABASE_SERVICE_ROLE_KEY) ---

test.describe.serial('Login — successful flow', () => {
  const loginEmail = `e2e-login-${Date.now()}@test.local`;
  const loginPassword = 'E2eLogin1!';
  let loginUserId = '';

  test.beforeAll(async () => {
    if (!hasAdminAccess) return;
    const admin = makeAdmin();
    const { data } = await admin.auth.admin.createUser({
      email: loginEmail,
      password: loginPassword,
      email_confirm: true,
    });
    loginUserId = data.user?.id ?? '';
  });

  test.afterAll(async () => {
    if (!hasAdminAccess || !loginUserId) return;
    const admin = makeAdmin();
    await admin.auth.admin.deleteUser(loginUserId);
  });

  test('successful login redirects to /dashboard', async ({ page }) => {
    test.skip(!hasAdminAccess, 'Requires SUPABASE_SERVICE_ROLE_KEY');
    await page.goto('/login');
    await page.getByLabel('Email').fill(loginEmail);
    await page.getByLabel('Password').fill(loginPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('redirect preservation: login then redirected to original destination', async ({ page }) => {
    test.skip(!hasAdminAccess, 'Requires SUPABASE_SERVICE_ROLE_KEY');
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/);
    await page.getByLabel('Email').fill(loginEmail);
    await page.getByLabel('Password').fill(loginPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/dashboard');
  });
});

test.describe.serial('Reset Password — successful flow', () => {
  const resetEmail = `e2e-reset-${Date.now()}@test.local`;
  const resetPassword = 'E2eReset1!';
  let resetUserId = '';

  test.beforeAll(async () => {
    if (!hasAdminAccess) return;
    const admin = makeAdmin();
    const { data } = await admin.auth.admin.createUser({
      email: resetEmail,
      password: resetPassword,
      email_confirm: true,
    });
    resetUserId = data.user?.id ?? '';
  });

  test.afterAll(async () => {
    if (!hasAdminAccess || !resetUserId) return;
    const admin = makeAdmin();
    await admin.auth.admin.deleteUser(resetUserId);
  });

  test('valid token resets password and redirects to /login with success banner', async ({
    page,
  }) => {
    test.skip(!hasAdminAccess, 'Requires SUPABASE_SERVICE_ROLE_KEY');
    const admin = makeAdmin();
    const { data: linkData } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: resetEmail,
    });
    const tokenHash = linkData?.properties?.hashed_token;
    if (!tokenHash) throw new Error('Failed to generate recovery token');

    await page.goto(`/reset-password?token_hash=${tokenHash}&type=recovery`);
    await page.getByLabel('New password').fill('NewE2eReset1!');
    await page.getByLabel('Confirm password').fill('NewE2eReset1!');
    await page.getByRole('button', { name: 'Reset password' }).click();
    await expect(page).toHaveURL('/login?reset=success');
    await expect(page.getByText('Password reset. Please log in.')).toBeVisible();
  });
});
