import { NextRequest, NextResponse } from 'next/server';
import { createContent } from '@/lib/actions/content';
import { withCreatorSessionValidation } from '@/lib/auth/session-middleware';
import { prisma } from '@foleio/database';
import { getPlanLimits } from '@/lib/utils/plan-limits';

type CreateContentInput = Parameters<typeof createContent>[0];

function normalizeContentPayload(data: Record<string, any>) {
  const isTutorial = data.contentCategory === 'tutorial';
  const isInCollection = Boolean(data.collectionId);

  if (!isTutorial) {
    return data;
  }

  if (isInCollection) {
    return {
      ...data,
      accessType: 'collection',
      tutorialPrice: 0,
    };
  }

  const normalizedPrice = Number(data.tutorialPrice || 0);
  if (data.accessType !== 'free' && normalizedPrice <= 0) {
    return { error: 'Standalone tutorial must have a price or be marked as free' };
  }

  return {
    ...data,
    tutorialPrice: data.accessType === 'free' ? 0 : normalizedPrice,
  };
}

export async function POST(request: NextRequest) {
  return withCreatorSessionValidation(request, async (session, user) => {
    try {
      const creator = await prisma.creator.findUnique({
        where: { userId: user.id },
        select: { id: true, platformPlan: true },
      });

      if (!creator) {
        return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
      }

      const publishedCount = await prisma.content.count({
        where: { creatorId: creator.id, isPublished: true },
      });
      const limits = getPlanLimits(creator.platformPlan ?? null);

      if (publishedCount >= limits.maxContent) {
        return NextResponse.json(
          { error: 'Plan limit reached', limitType: 'maxContent' },
          { status: 403 }
        );
      }

      const data = await request.json();
      const normalizedData = normalizeContentPayload(data);

      if ('error' in normalizedData) {
        return NextResponse.json({ error: normalizedData.error }, { status: 400 });
      }

      const result = await createContent(normalizedData as CreateContentInput);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        contentId: result.contentId,
        milestoneUnlocked: result.milestoneUnlocked ?? false,
      });
    } catch (error) {
      console.error('Content creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create content' },
        { status: 500 }
      );
    }
  });
}
