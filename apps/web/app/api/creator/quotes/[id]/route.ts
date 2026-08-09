import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { assertCreatorApiAccess } from '@/lib/creator/api-session';
import {
  computeQuoteDeposit,
  newEntityId,
  normalizeQuoteLineItems,
  type QuoteMilestone,
} from '@/lib/quotes/helpers';
import {
  quoteHasProductLines,
  resolveHybridQuoteFields,
} from '@/lib/quotes/hybrid-invoice';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

async function loadOwnedQuote(creatorId: string, id: string) {
  return prisma.quote.findFirst({
    where: { id, creatorId },
  });
}

export async function GET(request: Request, context: RouteContext) {
  const access = await assertCreatorApiAccess(request);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id } = await context.params;
  const quote = await loadOwnedQuote(access.access.creator.id, id);
  if (!quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  }

  return NextResponse.json({ quote });
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await assertCreatorApiAccess(request);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id } = await context.params;
  const quote = await loadOwnedQuote(access.access.creator.id, id);
  if (!quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  }

  if (['deposit_paid', 'expired', 'declined'].includes(quote.status)) {
    return NextResponse.json(
      { error: `Cannot edit a ${quote.status} quote` },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.title === 'string' && body.title.trim()) {
    data.title = body.title.trim();
  }
  if (typeof body.customerName === 'string' && body.customerName.trim()) {
    data.customerName = body.customerName.trim();
  }
  if (typeof body.customerEmail === 'string' && body.customerEmail.trim()) {
    data.customerEmail = body.customerEmail.trim().toLowerCase();
  }
  if (typeof body.customerPhone === 'string') {
    data.customerPhone = body.customerPhone.trim();
  }
  if (typeof body.customerAddress === 'string') {
    data.customerAddress = body.customerAddress.trim();
  }
  if (typeof body.notes === 'string' || body.notes === null) {
    data.notes = body.notes;
  }

  const touchingHybrid =
    body.lineItems !== undefined ||
    body.linkedServiceId !== undefined ||
    body.serviceDate !== undefined ||
    body.deliveryFeeMode !== undefined ||
    body.deliveryTierId !== undefined ||
    body.deliveryFeeKobo !== undefined;

  if (touchingHybrid) {
    const hybrid = await resolveHybridQuoteFields({
      creatorId: access.access.creator.id,
      lineItemsRaw:
        body.lineItems !== undefined ? body.lineItems : quote.lineItems,
      linkedServiceId:
        body.linkedServiceId !== undefined
          ? body.linkedServiceId
          : quote.linkedServiceId,
      serviceDateRaw:
        body.serviceDate !== undefined ? body.serviceDate : quote.serviceDate,
      delivery: {
        deliveryFeeMode:
          body.deliveryFeeMode !== undefined
            ? body.deliveryFeeMode
            : quote.deliveryFeeMode,
        deliveryTierId:
          body.deliveryTierId !== undefined
            ? body.deliveryTierId
            : quote.deliveryTierId,
        deliveryFeeKobo:
          body.deliveryFeeKobo !== undefined
            ? body.deliveryFeeKobo
            : quote.deliveryFeeKobo,
      },
    });
    if (!hybrid.ok) {
      return NextResponse.json({ error: hybrid.error }, { status: 400 });
    }
    data.lineItems = hybrid.data.lineItems;
    data.linkedServiceId = hybrid.data.linkedServiceId;
    data.serviceDate = hybrid.data.serviceDate;
    data.deliveryTierId = hybrid.data.deliveryTierId;
    data.deliveryFeeKobo = hybrid.data.deliveryFeeKobo;
    data.deliveryFeeMode = hybrid.data.deliveryFeeMode;
    data.totalAmount = hybrid.data.totalAmount;
  }

  const lineItemsForDeposit =
    (data.lineItems as ReturnType<typeof normalizeQuoteLineItems> | undefined) ||
    normalizeQuoteLineItems(quote.lineItems);
  const hasProducts = quoteHasProductLines(lineItemsForDeposit);
  const totalAmount =
    typeof data.totalAmount === 'number' ? data.totalAmount : quote.totalAmount;

  let depositType =
    body.depositType === 'percent' || body.depositType === 'fixed'
      ? body.depositType
      : body.depositType === null
        ? null
        : quote.depositType;
  let depositValue =
    body.depositValue !== undefined
      ? body.depositValue == null
        ? null
        : Math.round(Number(body.depositValue))
      : quote.depositValue;

  if (hasProducts) {
    depositType = null;
    depositValue = null;
  }

  if (
    hasProducts ||
    body.depositType !== undefined ||
    body.depositValue !== undefined ||
    data.totalAmount != null
  ) {
    data.depositType = depositType;
    data.depositValue = depositValue;
    const split = computeQuoteDeposit({
      totalKobo: totalAmount as number,
      depositType: depositType as 'percent' | 'fixed' | null,
      depositValue: depositValue as number | null,
    });
    data.depositAmount = split.depositAmount;
    data.balanceAmount = split.balanceAmount;
  }

  if (Array.isArray(body.milestones)) {
    const milestones: QuoteMilestone[] = body.milestones.map(
      (row: Record<string, unknown>) => ({
        id: String(row.id || newEntityId()),
        label: String(row.label || 'Milestone').trim() || 'Milestone',
        dueDate: row.dueDate ? String(row.dueDate) : null,
        status: row.status === 'done' ? 'done' : 'pending',
      })
    );
    data.milestones = milestones;
  }

  if (body.validUntil !== undefined) {
    if (body.validUntil === null || body.validUntil === '') {
      data.validUntil = null;
    } else {
      const d = new Date(String(body.validUntil));
      data.validUntil = Number.isNaN(d.getTime()) ? null : d;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  const updated = await prisma.quote.update({
    where: { id: quote.id },
    data,
  });

  return NextResponse.json({ quote: updated });
}
