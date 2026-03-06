import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { withCreatorSessionValidation } from '@/lib/auth/session-middleware';
import { MILESTONE_LABELS, MILESTONE_EMOJIS, type Milestone } from '@/lib/utils/milestones';

export async function GET(request: NextRequest) {
  return withCreatorSessionValidation(request, async (_session, user) => {
    const creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        username: true,
        displayName: true,
      },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator profile not found' }, { status: 404 });
    }

    const milestones = await prisma.milestoneLog.findMany({
      where: {
        creatorId: creator.id,
        seenAt: null,
      },
      orderBy: { achievedAt: 'asc' },
      select: {
        id: true,
        milestone: true,
        achievedAt: true,
      },
    });

    return NextResponse.json({
      milestones: milestones.map((item) => {
        const milestone = item.milestone as Milestone;
        return {
          id: item.id,
          milestone,
          achievedAt: item.achievedAt,
          label: MILESTONE_LABELS[milestone] || item.milestone,
          emoji: MILESTONE_EMOJIS[milestone] || '🎉',
          creatorName: creator.displayName,
          username: creator.username,
        };
      }),
    });
  });
}

export async function POST(request: NextRequest) {
  return withCreatorSessionValidation(request, async (_session, user) => {
    const creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator profile not found' }, { status: 404 });
    }

    const body = (await request.json()) as { milestone?: string };
    if (!body.milestone) {
      return NextResponse.json({ error: 'Milestone is required' }, { status: 400 });
    }

    await prisma.milestoneLog.updateMany({
      where: {
        creatorId: creator.id,
        milestone: body.milestone,
      },
      data: {
        seenAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  });
}
