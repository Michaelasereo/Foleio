import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
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

    const body = (await request.json()) as { productIds?: string[] };
    const productIds = Array.isArray(body.productIds) ? body.productIds.map(String) : [];
    if (productIds.length === 0) {
      return NextResponse.json({ error: 'productIds required' }, { status: 400 });
    }

    const owned = await prisma.product.findMany({
      where: { creatorId: creator.id, id: { in: productIds } },
      select: { id: true },
    });
    if (owned.length !== productIds.length) {
      return NextResponse.json({ error: 'Invalid product ids' }, { status: 400 });
    }

    await prisma.$transaction(
      productIds.map((productId, index) =>
        prisma.product.update({
          where: { id: productId },
          data: { orderIndex: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[creator/products/reorder] failed:', error);
    return NextResponse.json({ error: 'Failed to reorder products' }, { status: 500 });
  }
}
