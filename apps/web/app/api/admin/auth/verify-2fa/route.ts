import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@foleio/database';
import { getAdminPre2faIdFromRequest } from '@/lib/admin/auth';
import { consumeRateLimit } from '@/lib/admin/rate-limit';
import { verifyEncryptedTotp } from '@/lib/admin/totp';
import {
  clearAdminPre2faCookieHeader,
  createAdminSessionToken,
  setAdminSessionCookieHeader,
} from '@/lib/admin/crypto';

export const dynamic = 'force-dynamic';

const schema = z.object({
  code: z.string().trim().min(6).max(8),
});

export async function POST(request: Request) {
  try {
    const adminId = getAdminPre2faIdFromRequest(request);
    if (!adminId) {
      return NextResponse.json({ error: 'Password step expired. Sign in again.' }, { status: 401 });
    }

    if (!consumeRateLimit(`admin-2fa:${adminId}`)) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Enter the 6-digit authenticator code' }, { status: 400 });
    }

    const admin = await (prisma as any).adminUser.findUnique({ where: { id: adminId } });
    if (!admin?.totpEnabled || !admin.totpSecretEnc) {
      return NextResponse.json(
        { error: 'Authenticator is not set up for this account' },
        { status: 400 }
      );
    }

    if (!verifyEncryptedTotp(admin.totpSecretEnc, parsed.data.code)) {
      return NextResponse.json({ error: 'Invalid authenticator code' }, { status: 401 });
    }

    const session = createAdminSessionToken(admin.id);
    const res = NextResponse.json({
      success: true,
      passwordMustChange: Boolean(admin.passwordMustChange),
    });
    res.headers.append('Set-Cookie', setAdminSessionCookieHeader(session));
    res.headers.append('Set-Cookie', clearAdminPre2faCookieHeader());
    return res;
  } catch (error) {
    console.error('[admin/auth/verify-2fa]', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
