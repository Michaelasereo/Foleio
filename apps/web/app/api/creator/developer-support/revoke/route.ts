import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { assertCreatorApiAccess } from '@/lib/creator/api-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = await assertCreatorApiAccess(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (auth.access.mode === 'support') {
      return NextResponse.json(
        { error: 'Only the account owner can revoke developer support.' },
        { status: 403 }
      );
    }

    const { creator } = auth.access;

    await prisma.developerSupportGrant.updateMany({
      where: {
        creatorId: creator.id,
        status: { in: ['pending', 'active'] },
      },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, status: 'revoked' });
  } catch (error) {
    console.error('[creator/developer-support/revoke][POST] failed:', error);
    return NextResponse.json({ error: 'Failed to revoke developer support' }, { status: 500 });
  }
}
