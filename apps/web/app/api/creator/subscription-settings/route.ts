import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
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
      select: {
        subscriptionEnabled: true,
        monthlyPrice: true,
        subscriptionPerks: true,
      },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    return NextResponse.json({
      creator: {
        subscriptionEnabled: Boolean(creator.subscriptionEnabled),
        monthlyPrice: Number(creator.monthlyPrice || 0),
        subscriptionPerks: Array.isArray(creator.subscriptionPerks) ? creator.subscriptionPerks : [],
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to load subscription settings', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      subscriptionEnabled?: boolean;
      monthlyPrice?: number;
      subscriptionPerks?: string[];
    };

    const creator = await prisma.creator.update({
      where: { userId: user.id },
      data: {
        ...(body.subscriptionEnabled !== undefined && {
          subscriptionEnabled: Boolean(body.subscriptionEnabled),
        }),
        ...(body.monthlyPrice !== undefined && {
          monthlyPrice: Number(body.monthlyPrice) || 0,
        }),
        ...(body.subscriptionPerks !== undefined && {
          subscriptionPerks: Array.isArray(body.subscriptionPerks)
            ? body.subscriptionPerks.map((perk) => String(perk))
            : [],
        }),
      },
      select: {
        id: true,
        subscriptionEnabled: true,
        monthlyPrice: true,
        subscriptionPerks: true,
      },
    });

    return NextResponse.json({ creator });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update subscription settings', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
