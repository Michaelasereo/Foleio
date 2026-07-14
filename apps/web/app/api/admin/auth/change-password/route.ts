import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@foleio/database';
import { getAdminIdFromRequest } from '@/lib/admin/auth';
import { verifyEncryptedTotp } from '@/lib/admin/totp';
import { hashPassword, verifyPassword } from '@/lib/admin/crypto';

export const dynamic = 'force-dynamic';

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
  totpCode: z.string().trim().min(6).max(8).optional(),
});

export async function POST(request: Request) {
  try {
    const adminId = getAdminIdFromRequest(request);
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid password update' },
        { status: 400 }
      );
    }

    const admin = await (prisma as any).adminUser.findUnique({ where: { id: adminId } });
    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    const currentOk = await verifyPassword(parsed.data.currentPassword, admin.passwordHash);
    if (!currentOk) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    if (admin.totpEnabled && !admin.passwordMustChange) {
      if (!parsed.data.totpCode || !admin.totpSecretEnc) {
        return NextResponse.json(
          { error: 'Authenticator code is required' },
          { status: 400 }
        );
      }
      if (!verifyEncryptedTotp(admin.totpSecretEnc, parsed.data.totpCode)) {
        return NextResponse.json({ error: 'Invalid authenticator code' }, { status: 401 });
      }
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await (prisma as any).adminUser.update({
      where: { id: admin.id },
      data: {
        passwordHash,
        passwordMustChange: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/auth/change-password]', error);
    return NextResponse.json({ error: 'Could not change password' }, { status: 500 });
  }
}
