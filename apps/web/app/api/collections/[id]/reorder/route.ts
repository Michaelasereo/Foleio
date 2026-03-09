import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';

type ReorderItem = {
  id: string;
  sortOrder: number;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const collection = await prisma.collection.findFirst({
      where: { id, creatorId: creator.id },
      select: { id: true },
    });
    if (!collection) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = (await request.json()) as { order?: ReorderItem[] };
    const order = body.order ?? [];
    if (!Array.isArray(order) || order.length === 0) {
      return NextResponse.json({ error: 'order is required' }, { status: 400 });
    }

    const contentIds = order.map((item) => item.id);
    const sectionAssignments = await prisma.sectionContent.findMany({
      where: {
        section: { collectionId: id },
        contentId: { in: contentIds },
      },
      select: { contentId: true },
    });

    if (sectionAssignments.length > 0) {
      return NextResponse.json(
        { error: 'Only unsectioned collection videos can be reordered with this endpoint' },
        { status: 400 }
      );
    }

    await prisma.$transaction(
      order.map(({ id: contentId, sortOrder }) =>
        prisma.content.updateMany({
          where: {
            id: contentId,
            creatorId: creator.id,
            collectionId: id,
          },
          data: { sectionOrder: sortOrder },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Collection reorder error:', error);
    return NextResponse.json(
      { error: 'Failed to reorder collection videos', details: error?.message },
      { status: 500 }
    );
  }
}
