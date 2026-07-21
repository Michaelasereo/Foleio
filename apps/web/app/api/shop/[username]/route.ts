import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const creator = await prisma.creator.findUnique({
      where: { username, isPublic: true },
      select: { id: true, username: true, displayName: true },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const [products, deliveryTiers] = await Promise.all([
      prisma.product.findMany({
        where: {
          creatorId: creator.id,
          status: 'active',
          OR: [{ type: 'digital' }, { stock: { gt: 0 } }],
        },
        include: { variants: true },
        orderBy: [{ orderIndex: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.deliveryTier.findMany({
        where: { creatorId: creator.id },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const publicProducts = products.map((product) => {
      const { digitalFileUrl: _digitalFileUrl, ...rest } = product;
      return rest;
    });

    return NextResponse.json({
      creator,
      products: publicProducts,
      deliveryTiers,
    });
  } catch (error) {
    console.error('[shop/:username][GET] failed:', error);
    return NextResponse.json({ error: 'Failed to load shop' }, { status: 500 });
  }
}
