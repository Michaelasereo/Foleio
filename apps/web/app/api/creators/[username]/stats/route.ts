import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const creator = await prisma.creator.findUnique({
      where: { username, isPublic: true },
      select: { id: true },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const [subscriberCount, contentCount] = await Promise.all([
      prisma.fanSubscription.count({
        where: { creatorId: creator.id, status: 'active' },
      }),
      prisma.content.count({
        where: { creatorId: creator.id, isPublished: true },
      }),
    ]);

    return NextResponse.json({ subscriberCount, contentCount });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch creator stats', details: error?.message },
      { status: 500 }
    );
  }
}
