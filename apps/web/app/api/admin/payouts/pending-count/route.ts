import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';

export async function GET(request: NextRequest) {
  try {
    if (!isAdminAuthed(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await prisma.payout.count({
      where: {
        isManual: true,
        status: { in: ['pending', 'processing', 'PENDING', 'PROCESSING'] },
      },
    });

    return NextResponse.json({ pendingCount: count });
  } catch (error) {
    console.error('Admin payout pending count error:', error);
    return NextResponse.json({ error: 'Failed to fetch payout pending count' }, { status: 500 });
  }
}
