import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    if (!isAdminAuthed(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Transaction id is required' }, { status: 400 });
    }

    if (id.startsWith('deposit_booking_')) {
      return NextResponse.json(
        {
          error:
            'This deposit is derived from a booking. Delete the booking or wait for a ledger row.',
        },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      confirm?: string;
    };
    if (body.confirm !== 'DELETE') {
      return NextResponse.json(
        { error: 'confirm must be DELETE' },
        { status: 400 }
      );
    }

    const existing = await prisma.transaction.findUnique({
      where: { id },
      select: {
        id: true,
        reference: true,
        type: true,
        amount: true,
        creator: { select: { username: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    await prisma.transaction.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      deleted: existing,
    });
  } catch (error) {
    console.error('Admin delete transaction error:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
