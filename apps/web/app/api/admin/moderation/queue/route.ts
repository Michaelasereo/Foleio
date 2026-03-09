import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';

export async function GET(request: NextRequest) {
  try {
    if (!isAdminAuthed(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [flaggedVideos, thumbnailRejections, fanReports] = await Promise.all([
      prisma.content.findMany({
        where: {
          flaggedForReview: true,
          moderationStatus: 'pending',
        },
        orderBy: { flaggedAt: 'desc' },
        include: {
          creator: { select: { id: true, username: true, displayName: true } },
        },
      }),
      prisma.contentReport.findMany({
        where: { reason: 'auto_thumbnail_moderation' },
        orderBy: { createdAt: 'desc' },
        include: {
          content: {
            include: {
              creator: { select: { username: true, displayName: true } },
            },
          },
        },
      }),
      prisma.contentReport.findMany({
        where: {
          status: 'pending',
          reason: { not: 'auto_thumbnail_moderation' },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          content: {
            include: {
              creator: { select: { id: true, username: true, displayName: true } },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      flaggedVideos,
      thumbnailRejections,
      fanReports,
    });
  } catch (error) {
    console.error('Moderation queue error:', error);
    return NextResponse.json({ error: 'Failed to load moderation queue' }, { status: 500 });
  }
}
