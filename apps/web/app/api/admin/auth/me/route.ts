import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { getAdminIdFromRequest } from '@/lib/admin/auth';
import { ensureSeededAdminUser } from '@/lib/admin/seed-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await ensureSeededAdminUser();
    const adminId = getAdminIdFromRequest(request);
    if (!adminId) {
      return NextResponse.json({ authenticated: false });
    }

    const admin = await (prisma as any).adminUser.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        totpEnabled: true,
        passwordMustChange: true,
      },
    });

    if (!admin) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      admin: {
        id: admin.id,
        email: admin.email,
        totpEnabled: admin.totpEnabled,
        passwordMustChange: admin.passwordMustChange,
      },
    });
  } catch (error) {
    console.error('[admin/auth/me]', error);
    return NextResponse.json({ authenticated: false });
  }
}
