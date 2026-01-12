import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Fix for "prepared statement does not exist" error when using connection poolers
// If using a pooler (port 6543), ensure pgbouncer=true is in the connection string
// This tells Prisma to not use prepared statements (which don't work with poolers)
if (process.env.DATABASE_URL) {
  const dbUrl = process.env.DATABASE_URL;
  const isUsingPooler = dbUrl.includes(':6543/') || dbUrl.includes('pooler');
  const needsPgbouncer = isUsingPooler && !dbUrl.includes('pgbouncer=true');
  
  if (needsPgbouncer) {
    process.env.DATABASE_URL = dbUrl.includes('?')
      ? `${dbUrl}&pgbouncer=true`
      : `${dbUrl}?pgbouncer=true`;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

