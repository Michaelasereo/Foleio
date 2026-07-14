import { test, expect, type Page } from '@playwright/test';
import {
  approveInviteForE2e,
  disconnectE2eDb,
  ensureCreatorOnboardedForE2e,
  markCreatorPaymentsReady,
  seedAvailabilityForE2e,
} from './helpers/auth-otp';

/**
 * Prod-readiness path:
 * invite request → admin approve (DB) → OTP activate → onboard → services →
 * availability → public booking UI
 * Stops before Paystack popup (manual/staging for live charge).
 */
test.describe.serial('Creator prod-ready path', () => {
  test.setTimeout(240_000);

  const stamp = Date.now().toString(36);
  const email = `asereopeyemimichael+e2e${stamp}@gmail.com`;
  const password = 'TestOtp123!';
  const username = `e2e${stamp}`.slice(0, 20);
  const serviceName = `Brand Session ${stamp}`;

  test.afterAll(async () => {
    await disconnectE2eDb();
  });

  test('invite → OTP → onboard → service → availability → public book', async ({
    page,
  }) => {
    // --- 1. Request invite (API — RHF inputs are flaky under Playwright fill) ---
    const signupRes = await page.request.post('/api/auth/signup', {
      data: {
        email,
        password,
        firstName: 'E2E',
        lastName: 'Creator',
        username,
      },
    });
    const signupBody = await signupRes.json().catch(() => ({}));
    expect(signupRes.ok(), JSON.stringify(signupBody)).toBeTruthy();

    // --- 2. Approve invite + activate ---
    const { code, token } = await approveInviteForE2e(email);
    expect(code).toMatch(/^\d{6}$/);

    const acceptRes = await page.request.post('/api/auth/invite/accept', {
      data: { token, code },
    });
    const acceptBody = await acceptRes.json().catch(() => ({}));
    expect(acceptRes.ok(), JSON.stringify(acceptBody)).toBeTruthy();

    await ensureCreatorOnboardedForE2e({
      email,
      username,
      displayName: 'E2E Creator',
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const emailInput = page.getByPlaceholder('Email address');
    const passwordInput = page.getByPlaceholder('Password');
    await expect(emailInput).toBeVisible({ timeout: 30_000 });
    await emailInput.click();
    await emailInput.pressSequentially(email, { delay: 5 });
    await passwordInput.click();
    await passwordInput.pressSequentially(password, { delay: 5 });
    await expect(emailInput).toHaveValue(email);
    await expect(passwordInput).toHaveValue(password);
    await page.getByRole('button', { name: /^Log in$/i }).click();
    await page.waitForURL(/\/(dashboard|onboard)/, { timeout: 90_000 });

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 60_000 });

    // --- 4. Add service ---
    await page.goto('/bookings?tab=services', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('tab', { name: /Services/i })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole('button', { name: /^Add service$/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByPlaceholder(/Brand Photoshoot/i).fill(serviceName);
    await page.getByPlaceholder('45000').fill('25000');
    await page.getByPlaceholder('60').fill('60');
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /^Add service$/i })
      .click();

    await expect(page.getByText(serviceName)).toBeVisible({ timeout: 30_000 });

    // --- 5. Availability ---
    await page.goto('/bookings?tab=availability', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByText(/Availability management/i)).toBeVisible({
      timeout: 30_000,
    });

    await pickFutureAvailableDay(page);
    const availableToggle = page
      .getByRole('button', { name: /Available|Off/i })
      .first();
    if ((await availableToggle.getAttribute('aria-label')) === 'Off') {
      await availableToggle.click();
    }
    await expect(availableToggle).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: /Full day/i }).click();
    await page.getByRole('button', { name: /Save availability/i }).click();
    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 30_000 });

    // Unlock public Book without real Paystack bank setup
    await markCreatorPaymentsReady(username);
    await seedAvailabilityForE2e(username);

    // --- 6. Public profile unlock (full Paystack booking is manual/staging) ---
    await page.goto(`/creator/${username}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(serviceName).first()).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByText(/Sample services for preview/i)).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /^Book$|Book service/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });
});

async function pickFutureAvailableDay(page: Page) {
  const day = page.locator('button.foleio-avail-cal-day:not([disabled])').first();
  if ((await day.count()) > 0) {
    await expect(day).toBeVisible({ timeout: 15_000 });
    await day.click();
    return;
  }

  // Fallback: any enabled calendar day button (aria-label like "Wed, Jul 15")
  const labeled = page.getByRole('button', { name: /,\s+\w{3}\s+\d+/i });
  const count = await labeled.count();
  for (let i = 0; i < count; i++) {
    const btn = labeled.nth(i);
    if (await btn.isDisabled().catch(() => true)) continue;
    await btn.click();
    return;
  }

  throw new Error('No selectable availability day found');
}
