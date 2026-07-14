import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@foleio/database';
import { getAdminPre2faIdFromRequest, getAdminIdFromRequest } from '@/lib/admin/auth';
import { createTotpSetup, verifyEncryptedTotp } from '@/lib/admin/totp';
import { verifyPassword, setAdminTotpPendingCookieHeader } from '@/lib/admin/crypto';

export const dynamic = 'force-dynamic';

const schema = z.object({
  password: z.string().optional(),
  currentTotp: z.string().trim().min(6).max(8).optional(),
});

/**
 * Start TOTP setup. Allowed with pre-2FA (first login) or full session (settings).
 * First-time: stores secret on the admin row until confirm.
 * Re-setup (already enabled): requires password + current TOTP; stores pending secret in cookie.
 */
export async function POST(request: Request) {
  try {
    const fromPre = getAdminPre2faIdFromRequest(request);
    const fromSession = getAdminIdFromRequest(request);
    const adminId = fromPre || fromSession;
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body || {});
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const admin = await (prisma as any).adminUser.findUnique({ where: { id: adminId } });
    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    const setup = await createTotpSetup(admin.email);

    // Re-setup from settings while 2FA already enabled
    if (admin.totpEnabled && fromSession) {
      if (!parsed.data.password || !parsed.data.currentTotp) {
        return NextResponse.json(
          { error: 'Password and current authenticator code are required to re-setup 2FA' },
          { status: 400 }
        );
      }
      const passwordOk = await verifyPassword(parsed.data.password, admin.passwordHash);
      if (!passwordOk) {
        return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
      }
      if (!admin.totpSecretEnc || !verifyEncryptedTotp(admin.totpSecretEnc, parsed.data.currentTotp)) {
        return NextResponse.json({ error: 'Invalid authenticator code' }, { status: 401 });
      }

      const res = NextResponse.json({
        success: true,
        secret: setup.secretBase32,
        qrDataUrl: setup.qrDataUrl,
        otpauth: setup.otpauth,
        mode: 'pending',
      });
      res.headers.append('Set-Cookie', setAdminTotpPendingCookieHeader(setup.secretEnc));
      return res;
    }

    // First-time setup
    await (prisma as any).adminUser.update({
      where: { id: admin.id },
      data: {
        totpSecretEnc: setup.secretEnc,
        totpEnabled: false,
      },
    });

    return NextResponse.json({
      success: true,
      secret: setup.secretBase32,
      qrDataUrl: setup.qrDataUrl,
      otpauth: setup.otpauth,
      mode: 'first',
    });
  } catch (error) {
    console.error('[admin/auth/setup-2fa]', error);
    return NextResponse.json({ error: 'Could not start authenticator setup' }, { status: 500 });
  }
}
