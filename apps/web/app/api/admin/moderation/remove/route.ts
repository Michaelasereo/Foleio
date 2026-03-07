import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';
import { sendModerationReviewResultEmail } from '@/lib/email/moderation';

export async function POST(request: NextRequest) {
  try {
    if (!isAdminAuthed(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contentId, reason } = (await request.json()) as {
      contentId?: string;
      reason?: string;
    };
    if (!contentId) {
      return NextResponse.json({ error: 'contentId is required' }, { status: 400 });
    }

    const content = await prisma.content.update({
      where: { id: contentId },
      data: {
        moderationStatus: 'rejected',
        isPublished: false,
        flaggedForReview: false,
        flaggedReason: reason || 'Removed by moderation',
      },
      include: {
        creator: { include: { user: { select: { email: true } } } },
      },
    });

    await sendModerationReviewResultEmail({
      to: content.creator.user.email,
      title: content.title,
      approved: false,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove moderation error:', error);
    return NextResponse.json({ error: 'Failed to remove content' }, { status: 500 });
  }
}
