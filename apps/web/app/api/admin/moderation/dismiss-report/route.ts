import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';

export async function POST(request: NextRequest) {
  try {
    if (!isAdminAuthed(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportId } = (await request.json()) as { reportId?: string };
    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
    }

    await prisma.contentReport.update({
      where: { id: reportId },
      data: {
        status: 'dismissed',
        reviewedAt: new Date(),
        reviewedBy: 'admin',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Dismiss report error:', error);
    return NextResponse.json({ error: 'Failed to dismiss report' }, { status: 500 });
  }
}
