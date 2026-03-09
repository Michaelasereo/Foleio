import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';
import { sendCreatorBanEmail } from '@/lib/email/moderation';

export async function POST(request: NextRequest) {
  try {
    if (!isAdminAuthed(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { creatorId, reason } = (await request.json()) as {
      creatorId?: string;
      reason?: string;
    };
    if (!creatorId || !reason) {
      return NextResponse.json(
        { error: 'creatorId and reason are required' },
        { status: 400 }
      );
    }

    const creator = await prisma.creator.update({
      where: { id: creatorId },
      data: {
        isBanned: true,
        bannedAt: new Date(),
        banReason: reason,
        content: {
          updateMany: {
            where: {},
            data: { isPublished: false, moderationStatus: 'rejected' },
          },
        },
      },
      include: {
        user: { select: { email: true } },
      },
    });

    await prisma.fanSubscription.updateMany({
      where: { creatorId, status: 'active' },
      data: { status: 'canceled' },
    });

    await prisma.collectionSubscription.updateMany({
      where: { collection: { creatorId }, status: 'active' },
      data: { status: 'cancelled' },
    });

    await sendCreatorBanEmail({
      to: creator.user.email,
      name: creator.displayName,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ban moderation error:', error);
    return NextResponse.json({ error: 'Failed to ban creator' }, { status: 500 });
  }
}
