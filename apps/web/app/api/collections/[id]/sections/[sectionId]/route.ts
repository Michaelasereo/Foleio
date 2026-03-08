import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';

async function getCreatorId() {
  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const creator = await prisma.creator.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  return creator?.id || null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    const creatorId = await getCreatorId();
    if (!creatorId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id, sectionId } = await params;
    const section = await prisma.section.findFirst({
      where: {
        id: sectionId,
        collectionId: id,
        collection: { creatorId },
      },
      select: { id: true },
    });
    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    const body = (await request.json()) as {
      title?: string;
      description?: string | null;
      sortOrder?: number;
    };

    const updated = await prisma.section.update({
      where: { id: section.id },
      data: {
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.sortOrder !== undefined ? { orderIndex: body.sortOrder } : {}),
      },
    });

    return NextResponse.json({ section: updated });
  } catch (error: any) {
    console.error('Update section error:', error);
    return NextResponse.json(
      { error: 'Failed to update section', details: error?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    const creatorId = await getCreatorId();
    if (!creatorId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id, sectionId } = await params;
    const section = await prisma.section.findFirst({
      where: {
        id: sectionId,
        collectionId: id,
        collection: { creatorId },
      },
      select: { id: true, collectionId: true },
    });
    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    await prisma.sectionContent.deleteMany({
      where: { sectionId: section.id },
    });

    await prisma.section.delete({
      where: { id: section.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete section error:', error);
    return NextResponse.json(
      { error: 'Failed to delete section', details: error?.message },
      { status: 500 }
    );
  }
}
