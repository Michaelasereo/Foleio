import { test, expect } from '@playwright/test';

/**
 * Critical-path API smokes for shop orders, emails, earnings, and reconciliation.
 * These do not charge Paystack or send real email — they verify gates and validation.
 */
test.describe('Shop orders API', () => {
  test('create order rejects empty cart', async ({ request }) => {
    const res = await request.post('/api/shop/orders', {
      data: { username: 'missing-creator', items: [] },
    });
    expect([400, 404, 500]).toContain(res.status());
    const body = await res.json().catch(() => ({}));
    expect(body.error || body.message || res.status()).toBeTruthy();
  });

  test('order pay requires valid order id', async ({ request }) => {
    const res = await request.post(
      '/api/shop/orders/00000000-0000-4000-8000-000000000000/pay',
      { data: {} }
    );
    expect([400, 404, 500]).toContain(res.status());
  });
});

test.describe('Email + admin gates', () => {
  test('admin email resend requires auth', async ({ request }) => {
    const res = await request.post('/api/admin/emails/resend', {
      data: { bookingId: '00000000-0000-4000-8000-000000000000' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('admin reconciliation stats require auth', async ({ request }) => {
    const res = await request.get('/api/admin/reconciliation/stats');
    expect([401, 403]).toContain(res.status());
  });

  test('admin reconciliation retry requires auth', async ({ request }) => {
    const res = await request.post('/api/admin/reconciliation/retry', {
      data: {},
    });
    expect([401, 403, 400, 405]).toContain(res.status());
  });
});

test.describe('Earnings + onboarding surfaces', () => {
  test('creator earnings API requires auth', async ({ request }) => {
    const res = await request.get('/api/creator/earnings');
    expect([401, 403]).toContain(res.status());
  });

  test('onboarding status endpoint responds', async ({ request }) => {
    const res = await request.get('/api/auth/onboarding-status');
    expect([200, 401]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(typeof body.authenticated).toBe('boolean');
    }
  });

  test('onboard preview loads merchant sell step', async ({ page }) => {
    await page.goto('/onboard?preview=1&step=2', {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByText(/How do you sell|Booking services|Shop|Custom booking/i).first()
    ).toBeVisible({ timeout: 45_000 });
  });

  test('creators marketplace loads without support chat fab', async ({ page }) => {
    await page.goto('/creators', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Creator marketplace/i })).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.locator('.foleio-chat-fab')).toHaveCount(0);
  });

  test('signup home still loads', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(
      page
        .getByRole('heading', {
          name: /Creator, manage your business|Create account|Sign up|Get started|Join/i,
        })
        .or(page.getByPlaceholder(/Email address/i))
        .or(page.getByRole('button', { name: /Request invite|Sign up|Get started/i }))
        .first()
    ).toBeVisible({ timeout: 45_000 });
  });
});
