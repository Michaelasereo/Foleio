import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { sendModerationAlertEmail } from '@/lib/email/moderation';

export async function POST(request: Request) {
  try {
    const event = await request.json();

    if (event?.type !== 'video.asset.ready') {
      return NextResponse.json({ success: true });
    }

    const muxAssetId = event?.data?.id as string | undefined;
    if (!muxAssetId) {
      return NextResponse.json({ success: true });
    }

    const content = await prisma.content.findFirst({
      where: { muxAssetId },
      include: {
        creator: {
          include: {
            user: { select: { email: true } },
          },
        },
      },
    });

    if (!content) {
      return NextResponse.json({ success: true });
    }

    const asset = event.data;
    let flagged = false;
    let flagReason = '';

    if (Array.isArray(asset?.flags) && asset.flags.includes('explicit')) {
      flagged = true;
      flagReason = 'Content flagged by video analysis';
    }

    if (flagged) {
      await prisma.content.update({
        where: { id: content.id },
        data: {
          isPublished: false,
          flaggedForReview: true,
          flaggedReason: flagReason,
          flaggedAt: new Date(),
          moderationStatus: 'pending',
        },
      });

      await sendModerationAlertEmail({
        contentId: content.id,
        contentTitle: content.title,
        creatorEmail: content.creator.user.email,
        creatorName: content.creator.displayName,
        reason: flagReason,
      });
    } else {
      await prisma.content.update({
        where: { id: content.id },
        data: { moderationStatus: 'approved' },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mux webhook moderation error:', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
