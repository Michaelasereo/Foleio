import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';
import { sendModerationReviewResultEmail } from '@/lib/email/moderation';

export async function POST(request: NextRequest) {
  try {
    if (!isAdminAuthed(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contentId } = (await request.json()) as { contentId?: string };
    if (!contentId) {
      return NextResponse.json({ error: 'contentId is required' }, { status: 400 });
    }

    const content = await prisma.content.update({
      where: { id: contentId },
      data: {
        moderationStatus: 'approved',
        isPublished: true,
        flaggedForReview: false,
        flaggedReason: null,
      },
      include: {
        creator: { include: { user: { select: { email: true } } } },
      },
    });

    await sendModerationReviewResultEmail({
      to: content.creator.user.email,
      title: content.title,
      approved: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Approve moderation error:', error);
    return NextResponse.json({ error: 'Failed to approve content' }, { status: 500 });
  }
}
