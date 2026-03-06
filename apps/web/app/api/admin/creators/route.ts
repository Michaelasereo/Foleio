import { NextRequest, NextResponse } from 'next/server';
import { getCreatorHealthRows } from '@/lib/admin/creator-health';
import { isAdminAuthed } from '@/lib/admin/auth';

export async function GET(request: NextRequest) {
  try {
    if (!isAdminAuthed(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const creators = await getCreatorHealthRows();
    return NextResponse.json({ creators });
  } catch (error) {
    console.error('Admin creators route error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creator health data' },
      { status: 500 }
    );
  }
}
