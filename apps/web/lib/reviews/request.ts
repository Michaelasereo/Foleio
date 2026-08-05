import { randomBytes } from 'crypto';
import { prisma } from '@foleio/database';
import { sendEmail } from '@/lib/email/resend';
import { baseEmailTemplate } from '@/lib/email/base-template';
import { formatPrepEstimateLabel, groupByPrepEstimate } from '@/lib/shop/prep-estimate';
import { getCreatorPlanLimits } from '@/lib/utils/plan-limits';

function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com';
}

function newReviewToken() {
  return randomBytes(24).toString('hex');
}

type ReviewLine = {
  name: string;
  prepDaysMin?: number | null;
  prepDaysMax?: number | null;
};

function renderGroupedLines(lines: ReviewLine[]) {
  if (lines.length === 0) return '';
  const groups = groupByPrepEstimate(lines, (line) => ({
    prepDaysMin: line.prepDaysMin,
    prepDaysMax: line.prepDaysMax,
  }));
  return groups
    .map((group) => {
      const items = group.items
        .map((line) => `<li style="margin:0 0 4px;">${escapeHtml(line.name)}</li>`)
        .join('');
      return `<p style="margin:16px 0 6px;font-weight:600;">${escapeHtml(group.label)}</p><ul style="margin:0;padding-left:18px;">${items}</ul>`;
    })
    .join('');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function creatorAllowsReviewRequests(creatorId: string) {
  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    select: {
      reviewsEnabled: true,
      platformPlan: true,
      platformSubscriptionActive: true,
      displayName: true,
    },
  });
  if (!creator || !creator.reviewsEnabled) return null;
  if (getCreatorPlanLimits(creator).maxReviews <= 0) return null;
  return creator;
}

export async function sendBookingReviewRequest(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      priceListItem: { select: { name: true, minNoticeDays: true } },
    },
  });
  if (!booking || booking.status !== 'completed') return { skipped: true as const };
  if (booking.reviewEmailSentAt) return { skipped: true as const };

  const creator = await creatorAllowsReviewRequests(booking.creatorId);
  if (!creator) return { skipped: true as const };

  const token = booking.reviewToken || newReviewToken();
  if (!booking.reviewToken) {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { reviewToken: token },
    });
  }

  const reviewUrl = `${appBaseUrl()}/review/${token}`;
  const linesHtml = renderGroupedLines([
    {
      name: booking.priceListItem.name,
      prepDaysMin: booking.priceListItem.minNoticeDays,
      prepDaysMax: booking.priceListItem.minNoticeDays,
    },
  ]);

  const sent = await sendEmail({
    to: booking.customerEmail,
    subject: `How was your experience with ${creator.displayName}?`,
    html: baseEmailTemplate({
      previewText: `Leave a quick review for ${creator.displayName}`,
      body: `
        <p style="margin:0 0 16px;">Hi ${escapeHtml(booking.customerName)},</p>
        <p style="margin:0 0 16px;">Thanks for booking with <strong>${escapeHtml(creator.displayName)}</strong>. We’d love a short review.</p>
        ${linesHtml}
        <p style="margin:24px 0;">
          <a href="${reviewUrl}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:8px;">
            Leave a review
          </a>
        </p>
      `,
    }),
  });

  if (sent.success) {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { reviewEmailSentAt: new Date(), reviewToken: token },
    });
  }

  return sent;
}

export async function sendShopOrderReviewRequest(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: {
              name: true,
              prepDaysMin: true,
              prepDaysMax: true,
            },
          },
        },
      },
    },
  });
  if (!order || order.status !== 'delivered') return { skipped: true as const };
  if (order.reviewEmailSentAt) return { skipped: true as const };

  const creator = await creatorAllowsReviewRequests(order.creatorId);
  if (!creator) return { skipped: true as const };

  const address = (order.deliveryAddress || {}) as Record<string, unknown>;
  const email = String(address.email || '').trim();
  const customerName =
    String(address.name || '').trim() ||
    `${String(address.firstName || '').trim()} ${String(address.lastName || '').trim()}`.trim() ||
    'there';
  if (!email) return { skipped: true as const };

  const token = order.reviewToken || newReviewToken();
  if (!order.reviewToken) {
    await prisma.order.update({
      where: { id: orderId },
      data: { reviewToken: token },
    });
  }

  const reviewUrl = `${appBaseUrl()}/review/${token}`;
  const lines = order.items.map((item) => ({
    name: item.product?.name || 'Item',
    prepDaysMin: item.product?.prepDaysMin,
    prepDaysMax: item.product?.prepDaysMax,
  }));
  const linesHtml = renderGroupedLines(lines);

  const sent = await sendEmail({
    to: email,
    subject: `How was your order from ${creator.displayName}?`,
    html: baseEmailTemplate({
      previewText: `Leave a quick review for ${creator.displayName}`,
      body: `
        <p style="margin:0 0 16px;">Hi ${escapeHtml(customerName)},</p>
        <p style="margin:0 0 16px;">Your order from <strong>${escapeHtml(creator.displayName)}</strong> was marked delivered. We’d love a short review.</p>
        ${linesHtml}
        <p style="margin:24px 0;">
          <a href="${reviewUrl}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:8px;">
            Leave a review
          </a>
        </p>
      `,
    }),
  });

  if (sent.success) {
    await prisma.order.update({
      where: { id: orderId },
      data: { reviewEmailSentAt: new Date(), reviewToken: token },
    });
  }

  return sent;
}

export type ReviewRequestContext =
  | {
      kind: 'booking';
      token: string;
      creatorId: string;
      creatorName: string;
      customerName: string;
      alreadyReviewed: boolean;
      lines: Array<{ name: string; label: string }>;
    }
  | {
      kind: 'order';
      token: string;
      creatorId: string;
      creatorName: string;
      customerName: string;
      alreadyReviewed: boolean;
      lines: Array<{ name: string; label: string }>;
    };

export async function getReviewRequestByToken(
  token: string
): Promise<ReviewRequestContext | null> {
  const booking = await prisma.booking.findFirst({
    where: { reviewToken: token },
    include: {
      creator: { select: { id: true, displayName: true, reviewsEnabled: true } },
      priceListItem: { select: { name: true, minNoticeDays: true } },
      review: { select: { id: true } },
    },
  });
  if (booking) {
    return {
      kind: 'booking',
      token,
      creatorId: booking.creatorId,
      creatorName: booking.creator.displayName,
      customerName: booking.customerName,
      alreadyReviewed: Boolean(booking.review),
      lines: [
        {
          name: booking.priceListItem.name,
          label: formatPrepEstimateLabel(
            booking.priceListItem.minNoticeDays,
            booking.priceListItem.minNoticeDays
          ),
        },
      ],
    };
  }

  const order = await prisma.order.findFirst({
    where: { reviewToken: token },
    include: {
      creator: { select: { id: true, displayName: true, reviewsEnabled: true } },
      items: {
        include: {
          product: {
            select: { name: true, prepDaysMin: true, prepDaysMax: true },
          },
        },
      },
      review: { select: { id: true } },
    },
  });
  if (!order) return null;

  const address = (order.deliveryAddress || {}) as Record<string, unknown>;
  const customerName =
    String(address.name || '').trim() ||
    `${String(address.firstName || '').trim()} ${String(address.lastName || '').trim()}`.trim() ||
    'Customer';

  const groups = groupByPrepEstimate(order.items, (item) => ({
    prepDaysMin: item.product?.prepDaysMin,
    prepDaysMax: item.product?.prepDaysMax,
  }));

  return {
    kind: 'order',
    token,
    creatorId: order.creatorId,
    creatorName: order.creator.displayName,
    customerName,
    alreadyReviewed: Boolean(order.review),
    lines: groups.flatMap((group) =>
      group.items.map((item) => ({
        name: item.product?.name || 'Item',
        label: group.label,
      }))
    ),
  };
}

export async function submitReviewByToken(input: {
  token: string;
  rating: number;
  quote: string;
  location?: string | null;
}) {
  const rating = Math.min(5, Math.max(1, Math.floor(Number(input.rating) || 0)));
  const quote = String(input.quote || '').trim();
  const location = String(input.location || '').trim() || null;
  if (!quote) return { error: 'Please add a short comment' };
  if (rating < 1) return { error: 'Please choose a star rating' };

  const ctx = await getReviewRequestByToken(input.token);
  if (!ctx) return { error: 'This review link is invalid or expired' };
  if (ctx.alreadyReviewed) return { error: 'You already left a review' };

  const creator = await prisma.creator.findUnique({
    where: { id: ctx.creatorId },
    select: {
      id: true,
      reviewsEnabled: true,
      platformPlan: true,
      platformSubscriptionActive: true,
    },
  });
  if (!creator || !creator.reviewsEnabled) {
    return { error: 'Reviews are not accepting submissions right now' };
  }

  const limits = getCreatorPlanLimits(creator);
  const reviewCount = await prisma.creatorReview.count({
    where: { creatorId: creator.id },
  });
  if (reviewCount >= limits.maxReviews) {
    return { error: 'This creator is not accepting more reviews right now' };
  }

  if (ctx.kind === 'booking') {
    const booking = await prisma.booking.findFirst({
      where: { reviewToken: input.token },
      select: { id: true },
    });
    if (!booking) return { error: 'This review link is invalid or expired' };
    await prisma.creatorReview.create({
      data: {
        id: crypto.randomUUID(),
        creatorId: creator.id,
        customerName: ctx.customerName,
        location,
        quote,
        rating,
        bookingId: booking.id,
        orderIndex: reviewCount,
        isActive: true,
      },
    });
  } else {
    const order = await prisma.order.findFirst({
      where: { reviewToken: input.token },
      select: { id: true },
    });
    if (!order) return { error: 'This review link is invalid or expired' };
    await prisma.creatorReview.create({
      data: {
        id: crypto.randomUUID(),
        creatorId: creator.id,
        customerName: ctx.customerName,
        location,
        quote,
        rating,
        orderId: order.id,
        orderIndex: reviewCount,
        isActive: true,
      },
    });
  }

  return { success: true as const };
}
