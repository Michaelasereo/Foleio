import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/admin/auth';
import { deleteCreatorById } from '@/lib/admin/delete-creator';
import { prisma } from '@foleio/database';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    if (!isAdminAuthed(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Creator id is required' }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      confirmUsername?: string;
    };
    const confirmUsername = String(body.confirmUsername || '').trim();
    if (!confirmUsername) {
      return NextResponse.json(
        { error: 'confirmUsername is required' },
        { status: 400 }
      );
    }

    const creator = await prisma.creator.findUnique({
      where: { id },
      select: { id: true, username: true },
    });
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    if (creator.username.toLowerCase() !== confirmUsername.toLowerCase()) {
      return NextResponse.json(
        { error: 'Username confirmation does not match' },
        { status: 400 }
      );
    }

    const deleted = await deleteCreatorById(id);
    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    if (error instanceof Error && error.message === 'CREATOR_NOT_FOUND') {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }
    console.error('Admin delete creator error:', error);
    return NextResponse.json({ error: 'Failed to delete creator' }, { status: 500 });
  }
}
