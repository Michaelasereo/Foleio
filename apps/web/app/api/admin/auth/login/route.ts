import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@foleio/database';
import { ensureSeededAdminUser } from '@/lib/admin/seed-admin';
import { consumeRateLimit } from '@/lib/admin/rate-limit';
import {
  createAdminPre2faToken,
  setAdminPre2faCookieHeader,
  verifyPassword,
} from '@/lib/admin/crypto';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    await ensureSeededAdminUser();

    const ip = request.headers.get('x-forwarded-for') || 'local';
    if (!consumeRateLimit(`admin-login:${ip}`)) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const admin = await (prisma as any).adminUser.findUnique({ where: { email } });
    if (!admin) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const ok = await verifyPassword(parsed.data.password, admin.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = createAdminPre2faToken(admin.id);
    const res = NextResponse.json({
      success: true,
      totpEnabled: Boolean(admin.totpEnabled),
      passwordMustChange: Boolean(admin.passwordMustChange),
      email: admin.email,
    });
    res.headers.append('Set-Cookie', setAdminPre2faCookieHeader(token));
    return res;
  } catch (error) {
    console.error('[admin/auth/login]', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
