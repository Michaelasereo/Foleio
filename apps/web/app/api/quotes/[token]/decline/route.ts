import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const quote = await prisma.quote.findUnique({
    where: { publicToken: token },
  });

  if (!quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  }

  if (['deposit_paid', 'declined', 'expired'].includes(quote.status)) {
    return NextResponse.json(
      { error: `Quote is already ${quote.status}` },
      { status: 400 }
    );
  }

  if (!['sent', 'accepted', 'draft'].includes(quote.status)) {
    return NextResponse.json({ error: 'Quote cannot be declined' }, { status: 400 });
  }

  const updated = await prisma.quote.update({
    where: { id: quote.id },
    data: { status: 'declined' },
  });

  return NextResponse.json({ quote: { id: updated.id, status: updated.status } });
}
