import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Normalize pooled Supabase URLs for Prisma runtime stability.
// - pgbouncer=true avoids prepared statement issues behind poolers
// - connection_limit=1 avoids opening too many DB connections per process
// - pool_timeout gives query engine more time before throwing on bursty traffic
if (process.env.DATABASE_URL) {
  const dbUrl = process.env.DATABASE_URL;
  const isUsingPooler = dbUrl.includes(':6543/') || dbUrl.includes('pooler');
  if (isUsingPooler) {
    const [base, queryString = ''] = dbUrl.split('?');
    const params = new URLSearchParams(queryString);

    if (!params.has('pgbouncer')) {
      params.set('pgbouncer', 'true');
    }
    if (!params.has('connection_limit')) {
      params.set('connection_limit', '1');
    }
    if (!params.has('pool_timeout')) {
      params.set('pool_timeout', '30');
    }

    process.env.DATABASE_URL = `${base}?${params.toString()}`;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

