import { test, expect } from '@playwright/test';

test.describe('Admin smoke', () => {
  test('admin gate is reachable', async ({ page }) => {
    await page.goto('/admin');
    // Either login gate or already-authed dashboard
    const gate = page.getByText('Admin Access');
    const overview = page.getByText(/Creator Health|Total Creators|Transactions|Welcome/i);
    await expect(gate.or(overview).first()).toBeVisible({ timeout: 30_000 });
  });

  test('admin auth rejects empty password', async ({ request }) => {
    const res = await request.post('/api/admin/auth', {
      data: { password: '' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('admin creators API requires auth', async ({ request }) => {
    const res = await request.get('/api/admin/creators');
    expect(res.status()).toBe(401);
  });

  test('admin transactions API requires auth', async ({ request }) => {
    const res = await request.get('/api/admin/transactions');
    expect(res.status()).toBe(401);
  });
});
