import { prisma } from '@foleio/database';
import {
  hashPassword,
  SEEDED_ADMIN_EMAIL,
  SEEDED_ADMIN_PASSWORD,
} from '@/lib/admin/crypto';

/**
 * Ensure the seeded operator account exists (idempotent).
 */
export async function ensureSeededAdminUser() {
  const email = SEEDED_ADMIN_EMAIL.toLowerCase();
  const existing = await (prisma as any).adminUser.findUnique({
    where: { email },
  });
  if (existing) return existing as {
    id: string;
    email: string;
    passwordHash: string;
    totpSecretEnc: string | null;
    totpEnabled: boolean;
    passwordMustChange: boolean;
  };

  const passwordHash = await hashPassword(SEEDED_ADMIN_PASSWORD);
  return (prisma as any).adminUser.create({
    data: {
      email,
      passwordHash,
      totpEnabled: false,
      passwordMustChange: true,
    },
  }) as Promise<{
    id: string;
    email: string;
    passwordHash: string;
    totpSecretEnc: string | null;
    totpEnabled: boolean;
    passwordMustChange: boolean;
  }>;
}
