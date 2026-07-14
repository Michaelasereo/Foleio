import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@foleio/database';
import { getAdminPre2faIdFromRequest, getAdminIdFromRequest } from '@/lib/admin/auth';
import { verifyEncryptedTotp } from '@/lib/admin/totp';
import {
  ADMIN_COOKIE,
  clearAdminPre2faCookieHeader,
  clearAdminTotpPendingCookieHeader,
  createAdminSessionToken,
  getCookieValue,
  setAdminSessionCookieHeader,
} from '@/lib/admin/crypto';

export const dynamic = 'force-dynamic';

const schema = z.object({
  code: z.string().trim().min(6).max(8),
});

export async function POST(request: Request) {
  try {
    const fromPre = getAdminPre2faIdFromRequest(request);
    const fromSession = getAdminIdFromRequest(request);
    const adminId = fromPre || fromSession;
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Enter the 6-digit authenticator code' }, { status: 400 });
    }

    const admin = await (prisma as any).adminUser.findUnique({ where: { id: adminId } });
    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    const pendingEnc = getCookieValue(request.headers.get('cookie'), ADMIN_COOKIE.totpPending);
    const secretEnc = pendingEnc || admin.totpSecretEnc;
    if (!secretEnc) {
      return NextResponse.json({ error: 'Start authenticator setup first' }, { status: 400 });
    }

    if (!verifyEncryptedTotp(secretEnc, parsed.data.code)) {
      return NextResponse.json({ error: 'Invalid authenticator code' }, { status: 401 });
    }

    await (prisma as any).adminUser.update({
      where: { id: admin.id },
      data: {
        totpSecretEnc: secretEnc,
        totpEnabled: true,
      },
    });

    const res = NextResponse.json({
      success: true,
      passwordMustChange: Boolean(admin.passwordMustChange),
    });

    res.headers.append('Set-Cookie', clearAdminTotpPendingCookieHeader());

    // First-time setup from login: promote to full session
    if (fromPre && !fromSession) {
      res.headers.append(
        'Set-Cookie',
        setAdminSessionCookieHeader(createAdminSessionToken(admin.id))
      );
      res.headers.append('Set-Cookie', clearAdminPre2faCookieHeader());
    }

    return res;
  } catch (error) {
    console.error('[admin/auth/confirm-2fa]', error);
    return NextResponse.json({ error: 'Could not enable authenticator' }, { status: 500 });
  }
}
