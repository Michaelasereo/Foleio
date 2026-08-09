import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { assertCreatorApiAccess } from '@/lib/creator/api-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const access = await assertCreatorApiAccess(request);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const requests = await prisma.quoteRequest.findMany({
    where: {
      creatorId: access.access.creator.id,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      linkedService: { select: { id: true, name: true } },
      quotes: {
        select: { id: true, status: true, publicToken: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 3,
      },
    },
  });

  return NextResponse.json({ requests });
}
