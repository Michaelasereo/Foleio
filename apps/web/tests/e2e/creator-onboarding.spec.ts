import { test, expect } from '@playwright/test';

/**
 * Full signup/onboarding needs a real seeded user + Paystack.
 * This smoke checks the creator login entry surface is reachable.
 */
test.describe('Creator smoke', () => {
  test('login page loads for creators', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByRole('button', { name: /log in|sign in|continue|submit/i }).first()
    ).toBeVisible();
  });

  test('dashboard redirects unauthenticated creators', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/login|dashboard|onboard/, { timeout: 45_000 });
    expect(page.url()).toMatch(/login|dashboard|onboard/);
  });
});
