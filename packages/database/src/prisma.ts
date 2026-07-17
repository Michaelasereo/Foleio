import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaDatasourceUrl: string | undefined;
};

function normalizeDatabaseUrl(rawUrl: string): string {
  const dbUrl = rawUrl.trim();
  if (!dbUrl) return dbUrl;

  const [base, queryString = ''] = dbUrl.split('?');
  const params = new URLSearchParams(queryString);

  const isUsingPooler = dbUrl.includes(':6543/') || dbUrl.includes('pooler');
  if (isUsingPooler) {
    if (!params.has('pgbouncer')) {
      params.set('pgbouncer', 'true');
    }
    // Keep this small for Supabase transaction pooler, but >1 so layout + page
    // queries can run without starving (connection_limit=1 caused login hangs).
    if (!params.has('connection_limit') || params.get('connection_limit') === '1') {
      params.set('connection_limit', '5');
    }
    if (!params.has('pool_timeout')) {
      params.set('pool_timeout', '10');
    }
  }

  if (!params.has('sslmode')) {
    params.set('sslmode', 'require');
  }
  // Fail fast instead of hanging the whole page on a dead connection.
  if (!params.has('connect_timeout')) {
    params.set('connect_timeout', '5');
  }

  return `${base}?${params.toString()}`;
}

function resolveDatabaseUrl(): string {
  // Prefer the transaction pooler for app traffic (faster for many short queries).
  // DIRECT_URL is for migrations / prisma db push.
  const fromEnv =
    process.env.DATABASE_URL?.trim() ||
    process.env.DIRECT_URL?.trim() ||
    '';

  if (!fromEnv) {
    throw new Error(
      'DATABASE_URL is not set. Add it to apps/web/.env.local and restart the dev server.'
    );
  }

  return normalizeDatabaseUrl(fromEnv);
}

function createPrismaClient(datasourceUrl: string) {
  return new PrismaClient({
    datasources: {
      db: { url: datasourceUrl },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

function getPrismaClient(): PrismaClient {
  const datasourceUrl = resolveDatabaseUrl();

  // Recreate if env became available after a bad early import, or URL changed.
  if (
    !globalForPrisma.prisma ||
    globalForPrisma.prismaDatasourceUrl !== datasourceUrl
  ) {
    if (globalForPrisma.prisma) {
      void globalForPrisma.prisma.$disconnect().catch(() => undefined);
    }
    globalForPrisma.prisma = createPrismaClient(datasourceUrl);
    globalForPrisma.prismaDatasourceUrl = datasourceUrl;
  }

  return globalForPrisma.prisma;
}

/**
 * Lazy Prisma proxy — avoids constructing a client while Next is still
 * loading .env.local (which previously cached an empty DATABASE_URL client).
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
