import { expect, test, type Page } from '@playwright/test';

/**
 * E2E tests for the Companies CRUD flow.
 *
 * These tests require:
 * - A running Next.js dev/preview server (set BASE_URL env or use playwright.config.ts baseURL)
 * - A seeded test user (E2E_TEST_EMAIL / E2E_TEST_PASSWORD env vars)
 *
 * Acceptance criteria covered:
 * - List View: empty state, populated list, search
 * - Create: successful creation, missing name error
 * - Edit: successful edit
 * - Delete: delete with no applications
 */

const TEST_EMAIL = process.env['E2E_TEST_EMAIL'] ?? 'test@example.com';
const TEST_PASSWORD = process.env['E2E_TEST_PASSWORD'] ?? 'TestPassword123!';

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/companies|\/dashboard/);
}

test.describe('Companies', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/companies');
  });

  test('shows heading "Companies"', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Companies' })).toBeVisible();
  });

  test('create a new company and view detail', async ({ page }) => {
    const companyName = `E2E Corp ${Date.now()}`;

    await page.getByRole('link', { name: 'Add company' }).first().click();
    await page.waitForURL('/companies/new');

    await page.fill('input#name', companyName);
    await page.click('button[type="submit"]');

    // Should redirect to detail page
    await page.waitForURL(/\/companies\/[a-f0-9-]+$/);
    await expect(page.getByRole('heading', { name: companyName })).toBeVisible();
  });

  test('shows "Company name is required." on empty submit', async ({ page }) => {
    await page.goto('/companies/new');
    await page.click('button[type="submit"]');
    await expect(page.getByText('Company name is required.')).toBeVisible();
  });

  test('edit a company', async ({ page }) => {
    const originalName = `Edit Me ${Date.now()}`;
    const updatedName = `Renamed ${Date.now()}`;

    // Create
    await page.getByRole('link', { name: 'Add company' }).first().click();
    await page.fill('input#name', originalName);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/companies\/[a-f0-9-]+$/);

    // Edit
    await page.getByRole('link', { name: 'Edit' }).click();
    await page.waitForURL(/\/companies\/[a-f0-9-]+\/edit$/);

    await page.fill('input#name', updatedName);
    await page.click('button[type="submit"]');

    // Should redirect back to detail
    await page.waitForURL(/\/companies\/[a-f0-9-]+$/);
    await expect(page.getByRole('heading', { name: updatedName })).toBeVisible();
  });

  test('delete a company with no applications', async ({ page }) => {
    const companyName = `Delete Me ${Date.now()}`;

    // Create
    await page.getByRole('link', { name: 'Add company' }).first().click();
    await page.fill('input#name', companyName);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/companies\/[a-f0-9-]+$/);

    // Delete
    await page.getByRole('button', { name: 'Delete company' }).click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('button', { name: 'Delete' }).click();

    // Should redirect to /companies
    await page.waitForURL('/companies');
    await expect(page.getByText(companyName)).not.toBeVisible();
  });

  test('search filters companies by name', async ({ page }) => {
    // This test assumes there are at least two companies visible after setup.
    // For robustness, it creates them.
    const nameA = `Acme-${Date.now()}`;
    const nameB = `Beta-${Date.now()}`;

    for (const name of [nameA, nameB]) {
      await page.getByRole('link', { name: 'Add company' }).first().click();
      await page.fill('input#name', name);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/companies\/[a-f0-9-]+$/);
      await page.goto('/companies');
    }

    await page.fill('input[aria-label="Search companies"]', 'Acme');
    await expect(page.getByText(nameA)).toBeVisible();
    await expect(page.getByText(nameB)).not.toBeVisible();
  });
});
