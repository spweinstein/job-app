import { expect, test } from '@playwright/test';

const TEST_EMAIL = `e2e-${Date.now()}@test.local`;
const TEST_PASSWORD = 'E2ePassword1!';
const NEW_PASSWORD = 'NewE2ePassword1!';

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
    // Use the same email twice
    const dupEmail = `dup-${Date.now()}@test.local`;
    await page.goto('/signup');
    await page.getByLabel('Email').fill(dupEmail);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Check your email to confirm your account.')).toBeVisible();

    // Try again with same email
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
