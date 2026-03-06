import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { serializePrismaObject } from '@/lib/utils/serialization';

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') || '1'));
    const pageSize = 50;

    const [items, total] = await Promise.all([
      prisma.payout.findMany({
        where: { creatorId: creator.id },
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
        select: {
          id: true,
          amount: true,
          status: true,
          processedAt: true,
          paystackReference: true,
          failureReason: true,
          createdAt: true,
        },
      }),
      prisma.payout.count({ where: { creatorId: creator.id } }),
    ]);

    return NextResponse.json(
      serializePrismaObject({
        payouts: items,
        page,
        pageSize,
        total,
      })
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch payout history' },
      { status: 500 }
    );
  }
}
