import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';

export async function GET(request: NextRequest) {
  try {
    if (!isAdminAuthed(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [flaggedVideos, thumbnailRejections, fanReports] = await Promise.all([
      prisma.content.count({
        where: {
          flaggedForReview: true,
          moderationStatus: 'pending',
        },
      }),
      prisma.contentReport.count({
        where: { reason: 'auto_thumbnail_moderation' },
      }),
      prisma.contentReport.count({
        where: {
          status: 'pending',
          reason: { not: 'auto_thumbnail_moderation' },
        },
      }),
    ]);

    return NextResponse.json({
      flaggedVideos,
      thumbnailRejections,
      fanReports,
      totalPending: flaggedVideos + fanReports,
    });
  } catch (error) {
    console.error('Moderation count error:', error);
    return NextResponse.json({ error: 'Failed to load moderation count' }, { status: 500 });
  }
}
