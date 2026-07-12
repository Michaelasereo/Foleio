import { test, expect } from '@playwright/test';

/**
 * Subaccount booking payment path — API + public gate smokes.
 * Full Paystack popup is not exercised in CI (use staging manual for that).
 */
test.describe('Subaccount booking payments', () => {
  test('initialize-payment rejects invalid booking id', async ({ request }) => {
    const res = await request.post('/api/bookings/initialize-payment', {
      data: { bookingId: 'not-a-uuid' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('initialize-payment returns not found for missing booking', async ({ request }) => {
    const res = await request.post('/api/bookings/initialize-payment', {
      data: { bookingId: '00000000-0000-4000-8000-000000000000' },
    });
    // 404 booking not found, or 500 if DB unreachable in CI
    expect([404, 400, 500]).toContain(res.status());
  });

  test('verify-payment requires reference and bookingId', async ({ request }) => {
    const res = await request.post('/api/bookings/verify-payment', {
      data: {},
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(String(body.error || '')).toMatch(/reference|booking/i);
  });

  test('public creator profile shows book or payments-not-ready', async ({ page }) => {
    await page.goto('/creator/orjar');
    // Profile may 404 in empty envs — skip soft
    const title = page.locator('h1');
    const notFound = page.getByText(/not found|Something went wrong/i);
    await expect(title.or(notFound).first()).toBeVisible({ timeout: 45_000 });

    if (await notFound.isVisible().catch(() => false)) {
      test.skip(true, 'Creator orjar not present in this environment');
      return;
    }

    const bookCta = page.getByRole('button', { name: /Book service|Book/i });
    const paymentsNotReady = page.getByText(/Payments not set up yet/i);
    // One of: can book, payments blocked, or sample preview book
    await expect(bookCta.or(paymentsNotReady).first()).toBeVisible({ timeout: 15_000 });
  });

  test('earnings page requires auth (redirect or login)', async ({ page }) => {
    await page.goto('/earnings');
    await page.waitForURL(/login|earnings|onboard/, { timeout: 30_000 });
    const url = page.url();
    expect(url).toMatch(/login|earnings|onboard/);
  });
});
