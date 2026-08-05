import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { assertCreatorApiAccess } from '@/lib/creator/api-session';
import { getDeveloperSupportSession } from '@/lib/developer-support/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await assertCreatorApiAccess(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supportSession = await getDeveloperSupportSession(request);
    if (supportSession) {
      const grant = await prisma.developerSupportGrant.findUnique({
        where: { id: supportSession.grantId },
        select: {
          status: true,
          acceptedAt: true,
          expiresAt: true,
          requestedAt: true,
        },
      });
      return NextResponse.json({
        mode: 'support',
        status: grant?.status ?? 'active',
        acceptedAt: grant?.acceptedAt?.toISOString() ?? null,
        expiresAt: grant?.expiresAt?.toISOString() ?? null,
        requestedAt: grant?.requestedAt?.toISOString() ?? null,
      });
    }

    const grant = await prisma.developerSupportGrant.findFirst({
      where: {
        creatorId: auth.access.creator.id,
        status: { in: ['pending', 'active'] },
      },
      orderBy: { requestedAt: 'desc' },
      select: {
        status: true,
        acceptedAt: true,
        expiresAt: true,
        requestedAt: true,
      },
    });

    return NextResponse.json({
      mode: 'owner',
      status: grant?.status ?? 'none',
      acceptedAt: grant?.acceptedAt?.toISOString() ?? null,
      expiresAt: grant?.expiresAt?.toISOString() ?? null,
      requestedAt: grant?.requestedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('[creator/developer-support][GET] failed:', error);
    return NextResponse.json({ error: 'Failed to load developer support status' }, { status: 500 });
  }
}
