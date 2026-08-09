import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { assertCreatorApiAccess } from '@/lib/creator/api-session';
import {
  computeQuoteDeposit,
  defaultValidUntil,
  newEntityId,
  newPublicToken,
  type QuoteMilestone,
} from '@/lib/quotes/helpers';
import {
  quoteHasProductLines,
  resolveHybridQuoteFields,
} from '@/lib/quotes/hybrid-invoice';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const access = await assertCreatorApiAccess(request);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const quotes = await prisma.quote.findMany({
    where: { creatorId: access.access.creator.id },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({ quotes });
}

export async function POST(request: Request) {
  const access = await assertCreatorApiAccess(request);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const creator = await prisma.creator.findUnique({
    where: { id: access.access.creator.id },
    select: { customQuotesEnabled: true, balanceDueDaysBefore: true },
  });
  if (!creator?.customQuotesEnabled) {
    return NextResponse.json(
      { error: 'Custom quotes are turned off. Enable them in Settings → Modules.' },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const quoteRequestId =
    typeof body.quoteRequestId === 'string' ? body.quoteRequestId.trim() : null;

  let customerName = String(body.customerName || '').trim();
  let customerEmail = String(body.customerEmail || '').trim().toLowerCase();
  let customerPhone = String(body.customerPhone || '').trim();
  let linkedServiceId =
    typeof body.linkedServiceId === 'string' ? body.linkedServiceId.trim() : null;
  let title = String(body.title || '').trim();
  let brief = '';

  if (quoteRequestId) {
    const reqRow = await prisma.quoteRequest.findFirst({
      where: { id: quoteRequestId, creatorId: access.access.creator.id },
    });
    if (!reqRow) {
      return NextResponse.json({ error: 'Quote request not found' }, { status: 404 });
    }
    customerName = customerName || reqRow.customerName;
    customerEmail = customerEmail || reqRow.customerEmail;
    customerPhone = customerPhone || reqRow.customerPhone;
    linkedServiceId = linkedServiceId || reqRow.linkedServiceId;
    brief = reqRow.brief;
    if (!title) title = `Quote for ${reqRow.customerName}`;
  }

  if (!customerName || !customerEmail) {
    return NextResponse.json(
      { error: 'Customer name and email are required' },
      { status: 400 }
    );
  }

  if (!title) title = `Quote for ${customerName}`;

  const hybrid = await resolveHybridQuoteFields({
    creatorId: access.access.creator.id,
    lineItemsRaw: body.lineItems,
    linkedServiceId,
    serviceDateRaw: body.serviceDate,
    delivery: {
      deliveryFeeMode: body.deliveryFeeMode,
      deliveryTierId: body.deliveryTierId,
      deliveryFeeKobo: body.deliveryFeeKobo,
    },
    defaultLineLabel: brief ? brief.slice(0, 80) : 'Project',
  });

  if (!hybrid.ok) {
    return NextResponse.json({ error: hybrid.error }, { status: 400 });
  }

  const hasProducts = quoteHasProductLines(hybrid.data.lineItems);
  const depositType =
    hasProducts
      ? null
      : body.depositType === 'percent' || body.depositType === 'fixed'
        ? body.depositType
        : null;
  const depositValue =
    hasProducts
      ? null
      : body.depositValue != null
        ? Math.round(Number(body.depositValue))
        : null;
  const split = computeQuoteDeposit({
    totalKobo: hybrid.data.totalAmount,
    depositType,
    depositValue,
  });

  const milestones: QuoteMilestone[] = Array.isArray(body.milestones)
    ? body.milestones.map((row: Record<string, unknown>) => ({
        id: String(row.id || newEntityId()),
        label: String(row.label || 'Milestone').trim() || 'Milestone',
        dueDate: row.dueDate ? String(row.dueDate) : null,
        status: row.status === 'done' ? 'done' : 'pending',
      }))
    : [];

  const customerAddress = String(body.customerAddress || '').trim();

  const quote = await prisma.quote.create({
    data: {
      creatorId: access.access.creator.id,
      quoteRequestId,
      linkedServiceId: hybrid.data.linkedServiceId,
      customerName,
      customerEmail,
      customerPhone: customerPhone || '',
      customerAddress,
      title,
      lineItems: hybrid.data.lineItems,
      totalAmount: hybrid.data.totalAmount,
      depositType,
      depositValue,
      depositAmount: split.depositAmount,
      balanceAmount: split.balanceAmount,
      milestones,
      serviceDate: hybrid.data.serviceDate,
      deliveryTierId: hybrid.data.deliveryTierId,
      deliveryFeeKobo: hybrid.data.deliveryFeeKobo,
      deliveryFeeMode: hybrid.data.deliveryFeeMode,
      validUntil: defaultValidUntil(),
      publicToken: newPublicToken(),
      status: 'draft',
      notes: typeof body.notes === 'string' ? body.notes : null,
    },
  });

  return NextResponse.json({ quote });
}
