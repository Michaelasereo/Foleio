import type { User as SupabaseUser } from '@supabase/supabase-js';
import { prisma } from '@foleio/database';

/**
 * Ensures the app-level users table has a row for the authenticated Supabase user.
 * This prevents FK failures when creating related rows like `creator`.
 */
export async function ensureDbUser(user: SupabaseUser) {
  return prisma.user.upsert({
    where: { id: user.id },
    update: {
      email: user.email || '',
      fullName: user.user_metadata?.full_name || null,
      emailVerified: Boolean(user.email_confirmed_at),
    },
    create: {
      id: user.id,
      email: user.email || '',
      fullName: user.user_metadata?.full_name || null,
      emailVerified: Boolean(user.email_confirmed_at),
    },
  });
}
