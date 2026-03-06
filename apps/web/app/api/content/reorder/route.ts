import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const body = await request.json();
    const order = Array.isArray(body?.order) ? body.order : [];
    if (order.length === 0) {
      return NextResponse.json({ error: 'Invalid order payload' }, { status: 400 });
    }

    const contentIds = order.map((item: any) => item.id).filter(Boolean);
    const owned = await prisma.content.findMany({
      where: {
        id: { in: contentIds },
        creatorId: creator.id,
      },
      select: { id: true },
    });

    if (owned.length !== contentIds.length) {
      return NextResponse.json({ error: 'Unauthorized reorder request' }, { status: 401 });
    }

    await prisma.$transaction(
      order.map((item: any, index: number) =>
        prisma.content.update({
          where: { id: item.id },
          data: { sortOrder: Number.isFinite(item.sortOrder) ? item.sortOrder : index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Content reorder error:', error);
    return NextResponse.json(
      { error: 'Failed to reorder content', details: error.message },
      { status: 500 }
    );
  }
}
