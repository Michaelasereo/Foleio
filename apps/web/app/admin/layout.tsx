import { AdminLoginGate } from '@/components/admin/AdminLoginGate';
import { AdminShell } from '@/components/admin/AdminShell';
import {
  getAdminIdFromServerCookies,
  isAdminAuthedFromServerCookies,
} from '@/lib/admin/auth';
import { prisma } from '@foleio/database';
import { ensureSeededAdminUser } from '@/lib/admin/seed-admin';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await ensureSeededAdminUser();
  } catch {
    // Seed is best-effort; auth gate still works if DB is briefly unreachable.
  }
  const isAuthed = await isAdminAuthedFromServerCookies();

  if (!isAuthed) {
    return <AdminLoginGate />;
  }

  const adminId = await getAdminIdFromServerCookies();
  if (adminId) {
    try {
      const admin = await (prisma as any).adminUser.findUnique({
        where: { id: adminId },
        select: { passwordMustChange: true, totpEnabled: true },
      });
      // Force login gate for incomplete security setup
      if (admin && (!admin.totpEnabled || admin.passwordMustChange)) {
        return <AdminLoginGate />;
      }
    } catch {
      return <AdminLoginGate />;
    }
  }

  return <AdminShell>{children}</AdminShell>;
}
