import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { assertCreatorApiAccess } from '@/lib/creator/api-session';
import { developerSupportBlockedMessage } from '@/lib/developer-support/guard';
import { toWhatsAppDigits } from '@/lib/quotes/helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const access = await assertCreatorApiAccess(request);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const creator = await prisma.creator.findUnique({
    where: { id: access.access.creator.id },
    select: {
      fixedBookingsEnabled: true,
      customQuotesEnabled: true,
      shopEnabled: true,
      quoteWhatsappPhone: true,
    },
  });

  return NextResponse.json({
    fixedBookingsEnabled: creator?.fixedBookingsEnabled !== false,
    customQuotesEnabled: Boolean(creator?.customQuotesEnabled),
    shopEnabled: creator?.shopEnabled !== false,
    quoteWhatsappPhone: creator?.quoteWhatsappPhone || null,
  });
}

export async function PATCH(request: Request) {
  const access = await assertCreatorApiAccess(request);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (access.access.mode === 'support') {
    return NextResponse.json(
      { error: developerSupportBlockedMessage() },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const data: {
    fixedBookingsEnabled?: boolean;
    customQuotesEnabled?: boolean;
    shopEnabled?: boolean;
    quoteWhatsappPhone?: string | null;
  } = {};

  if (typeof body.fixedBookingsEnabled === 'boolean') {
    data.fixedBookingsEnabled = body.fixedBookingsEnabled;
  }
  if (typeof body.customQuotesEnabled === 'boolean') {
    data.customQuotesEnabled = body.customQuotesEnabled;
  }
  if (typeof body.shopEnabled === 'boolean') {
    data.shopEnabled = body.shopEnabled;
  }
  if (typeof body.quoteWhatsappPhone === 'string') {
    const digits = toWhatsAppDigits(body.quoteWhatsappPhone);
    data.quoteWhatsappPhone = digits;
  } else if (body.quoteWhatsappPhone === null) {
    data.quoteWhatsappPhone = null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  const updated = await prisma.creator.update({
    where: { id: access.access.creator.id },
    data,
    select: {
      fixedBookingsEnabled: true,
      customQuotesEnabled: true,
      shopEnabled: true,
      quoteWhatsappPhone: true,
    },
  });

  return NextResponse.json(updated);
}
