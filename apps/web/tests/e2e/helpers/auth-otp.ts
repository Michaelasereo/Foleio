import { randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

let prisma: PrismaClient | null = null;

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function getPrisma() {
  if (prisma) return prisma;

  // Playwright cwd is apps/web
  loadEnvFile(path.resolve(process.cwd(), '.env.local'));
  loadEnvFile(path.resolve(process.cwd(), '../../packages/database/.env'));

  // Prefer direct connection for e2e writes (pooler can break prepared statements).
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL missing for e2e OTP helper');
  }

  prisma = new PrismaClient({ datasources: { db: { url } } });
  return prisma;
}

/** Poll AuthOTPCode for the latest unused OTP (signup or invite). */
export async function waitForSignupOtp(
  email: string,
  {
    timeoutMs = 45_000,
    intervalMs = 1_000,
    purpose = 'signup',
  }: {
    timeoutMs?: number;
    intervalMs?: number;
    purpose?: 'signup' | 'invite' | 'email_verify';
  } = {}
): Promise<string> {
  const db = getPrisma();
  const normalized = email.toLowerCase().trim();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const row = await db.authOTPCode.findFirst({
      where: {
        email: normalized,
        purpose,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (row?.code) return row.code;
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`Timed out waiting for ${purpose} OTP for ${email}`);
}

/**
 * Approve a pending waitlist invite and create an invite OTP in DB
 * (skips Resend so e2e does not depend on email delivery).
 */
export async function approveInviteForE2e(email: string): Promise<{
  token: string;
  code: string;
  verifyPath: string;
}> {
  const db = getPrisma();
  const normalized = email.toLowerCase().trim();
  const token = randomBytes(24).toString('hex');
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const entry = await db.waitlistEntry.findUnique({ where: { email: normalized } });
  if (!entry) {
    throw new Error(`No waitlist entry for ${normalized}`);
  }

  await db.waitlistEntry.update({
    where: { id: entry.id },
    data: {
      status: 'approved',
      approvedAt: entry.approvedAt || new Date(),
      inviteToken: token,
    },
  });

  await db.authOTPCode.updateMany({
    where: { email: normalized, used: false, purpose: 'invite' },
    data: { used: true },
  });

  await db.authOTPCode.create({
    data: {
      email: normalized,
      code,
      purpose: 'invite',
      expiresAt,
    },
  });

  return {
    token,
    code,
    verifyPath: `/invite/verify?token=${encodeURIComponent(token)}`,
  };
}

/**
 * Finish creator profile in DB so e2e can continue past flaky onboard UI /
 * overloaded local server-action compiles.
 */
export async function ensureCreatorOnboardedForE2e(opts: {
  email: string;
  username: string;
  displayName?: string;
}) {
  const db = getPrisma();
  loadEnvFile(path.resolve(process.cwd(), '.env.local'));

  const email = opts.email.toLowerCase().trim();
  const username = opts.username.toLowerCase().trim();
  const displayName = opts.displayName || username;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase admin credentials for e2e onboard helper');
  }

  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const adminAny = admin.auth.admin as typeof admin.auth.admin & {
    getUserByEmail?: (email: string) => Promise<{
      data: { user: { id: string; email?: string } | null };
      error: Error | null;
    }>;
  };

  let authUserId: string | null = null;
  if (typeof adminAny.getUserByEmail === 'function') {
    const { data, error } = await adminAny.getUserByEmail(email);
    if (error) throw error;
    authUserId = data.user?.id || null;
  } else {
    const { data, error } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (error) throw error;
    authUserId =
      data.users.find((u) => u.email?.toLowerCase() === email)?.id || null;
  }

  if (!authUserId) {
    throw new Error(`Auth user not found for ${email}`);
  }

  await db.user.upsert({
    where: { id: authUserId },
    update: { email },
    create: {
      id: authUserId,
      email,
      fullName: displayName,
      emailVerified: true,
    },
  });

  await db.creator.upsert({
    where: { userId: authUserId },
    update: {
      username,
      displayName,
      category: 'photography',
      isPublic: true,
      hasCompletedOnboarding: true,
      platformPlan: 'STARTER',
      platformSubscriptionActive: false,
    },
    create: {
      userId: authUserId,
      username,
      displayName,
      category: 'photography',
      isPublic: true,
      hasCompletedOnboarding: true,
      platformPlan: 'STARTER',
      platformSubscriptionActive: false,
    },
  });
}

/** Mark creator payments as ready so public Book UI unlocks (no real Paystack/Dojah). */
export async function markCreatorPaymentsReady(username: string) {
  const db = getPrisma();
  await db.creator.update({
    where: { username: username.toLowerCase() },
    data: {
      bvnVerified: true,
      identityVerifiedAt: new Date(),
      paystackSubaccountCode: 'ACCT_e2e_test',
      subaccountStatus: 'ACTIVE',
    },
  });
}

/** Seed the next few days as available for public booking calendar. */
export async function seedAvailabilityForE2e(username: string, days = 7) {
  const db = getPrisma();
  const creator = await db.creator.findUnique({
    where: { username: username.toLowerCase() },
    select: { id: true },
  });
  if (!creator) throw new Error(`Creator not found: ${username}`);

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  for (let i = 1; i <= days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayOnly = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
    await db.creatorAvailability.upsert({
      where: {
        creatorId_date: {
          creatorId: creator.id,
          date: dayOnly,
        },
      },
      update: { isAvailable: true },
      create: {
        creatorId: creator.id,
        date: dayOnly,
        isAvailable: true,
      },
    });
  }
}

export async function disconnectE2eDb() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
