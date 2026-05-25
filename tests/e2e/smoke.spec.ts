import { test, expect } from '@playwright/test';

test('app loads without a 500 error', async ({ page }) => {
  const response = await page.goto('/');
  // The app should either show a page (200) or redirect to login (302 → 200).
  // It must not return a 500 error.
  expect(response?.status()).not.toBe(500);
});
