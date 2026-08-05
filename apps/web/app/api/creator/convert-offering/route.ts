import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { assertCreatorApiAccess } from '@/lib/creator/api-session';
import { getEffectiveCreatorPlanLimits } from '@/lib/billing/effective-plan-limits';
import { revalidatePublicCreator } from '@/lib/creator/revalidate-public';
import {
  isBelowMinPayableKobo,
  MIN_PAYABLE_PRICE_ERROR,
} from '@/lib/payments/min-amount';
import {
  BLOCKING_BOOKING_STATUSES,
  OPEN_ORDER_STATUSES,
  productAddonsToService,
  serviceAddonsToProduct,
} from '@/lib/shop/convert-offering';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function POST(request: Request) {
  try {
    const auth = await assertCreatorApiAccess(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (auth.access.mode === 'support') {
      return NextResponse.json(
        { error: 'Convert offering is not available in developer support mode.' },
        { status: 403 }
      );
    }

    const { creator } = auth.access;
    const body = await request.json();
    const sourceType = String(body?.sourceType || '').trim().toLowerCase();
    const sourceId = String(body?.sourceId || '').trim();

    if (!sourceId) {
      return NextResponse.json({ error: 'sourceId is required' }, { status: 400 });
    }

    const limits = await getEffectiveCreatorPlanLimits(creator);

    if (sourceType === 'product') {
      const product = await prisma.product.findFirst({
        where: { id: sourceId, creatorId: creator.id },
        include: { variants: true },
      });
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      if (product.type === 'digital' || product.type === 'gift_card') {
        return NextResponse.json(
          { error: 'Digital products and gift cards cannot be converted to services.' },
          { status: 400 }
        );
      }

      const serviceCount = await prisma.priceListItem.count({
        where: { creatorId: creator.id },
      });
      if (serviceCount >= limits.maxServices) {
        return NextResponse.json(
          { error: 'Plan limit reached', limitType: 'maxServices' },
          { status: 403 }
        );
      }

      const openOrder = await prisma.orderItem.findFirst({
        where: {
          productId: product.id,
          order: {
            creatorId: creator.id,
            status: { in: [...OPEN_ORDER_STATUSES] },
          },
        },
        select: { id: true },
      });
      if (openOrder) {
        return NextResponse.json(
          {
            error:
              'This product has open shop orders (pending, confirmed, or processing). Complete or cancel them before converting.',
          },
          { status: 409 }
        );
      }

      const maxOrder = await prisma.priceListItem.findFirst({
        where: { creatorId: creator.id },
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true },
      });

      const serviceId = crypto.randomUUID();
      const imageUrl = product.imageUrl || product.imageUrls[0] || null;
      const minNoticeDays =
        product.prepDaysMin != null && product.prepDaysMin > 0
          ? product.prepDaysMin
          : null;

      const result = await prisma.$transaction(async (tx) => {
        const service = await tx.priceListItem.create({
          data: {
            id: serviceId,
            creatorId: creator.id,
            serviceType: 'general',
            name: product.name,
            description: product.description,
            price: product.price,
            coverImageUrl: imageUrl,
            minNoticeDays,
            addons: productAddonsToService(product.addons),
            isActive: product.status === 'active',
            orderIndex: (maxOrder?.orderIndex ?? -1) + 1,
          },
        });
        await tx.productVariant.deleteMany({ where: { productId: product.id } });
        await tx.product.delete({ where: { id: product.id } });
        return service;
      });

      revalidatePublicCreator(creator.username);
      return NextResponse.json({
        targetType: 'service',
        targetId: result.id,
        redirectPath: '/bookings',
      });
    }

    if (sourceType === 'service') {
      const service = await prisma.priceListItem.findFirst({
        where: { id: sourceId, creatorId: creator.id },
      });
      if (!service) {
        return NextResponse.json({ error: 'Service not found' }, { status: 404 });
      }

      const productCount = await prisma.product.count({ where: { creatorId: creator.id } });
      if (productCount >= limits.maxProducts) {
        return NextResponse.json(
          { error: 'Plan limit reached', limitType: 'maxProducts' },
          { status: 403 }
        );
      }

      const futureBooking = await prisma.booking.findFirst({
        where: {
          priceListItemId: service.id,
          creatorId: creator.id,
          bookingDate: { gte: startOfTodayUtc() },
          status: { notIn: [...BLOCKING_BOOKING_STATUSES] },
        },
        select: { id: true },
      });
      if (futureBooking) {
        return NextResponse.json(
          {
            error:
              'This service has upcoming bookings. Reschedule or cancel them before converting.',
          },
          { status: 409 }
        );
      }

      if (isBelowMinPayableKobo(service.price)) {
        return NextResponse.json({ error: MIN_PAYABLE_PRICE_ERROR }, { status: 400 });
      }

      const maxOrder = await prisma.product.findFirst({
        where: { creatorId: creator.id },
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true },
      });

      const productId = crypto.randomUUID();
      const prepDaysMin =
        service.minNoticeDays != null && service.minNoticeDays > 0
          ? service.minNoticeDays
          : null;
      const imageUrl = service.coverImageUrl || null;

      const result = await prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            id: productId,
            creatorId: creator.id,
            name: service.name,
            description: service.description,
            price: service.price,
            type: 'physical',
            imageUrl,
            imageUrls: imageUrl ? [imageUrl] : [],
            stock: 0,
            status: 'draft',
            orderIndex: (maxOrder?.orderIndex ?? -1) + 1,
            prepDaysMin,
            prepDaysMax: null,
            addons: serviceAddonsToProduct(service.addons),
          },
        });
        await tx.priceListItem.delete({ where: { id: service.id } });
        return product;
      });

      revalidatePublicCreator(creator.username);
      return NextResponse.json({
        targetType: 'product',
        targetId: result.id,
        redirectPath: '/shop',
      });
    }

    return NextResponse.json(
      { error: 'sourceType must be product or service' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[creator/convert-offering][POST] failed:', error);
    const message =
      error instanceof Error && /foreign key|restrict/i.test(error.message)
        ? 'Cannot convert — this item is linked to past orders or bookings.'
        : 'Failed to convert offering';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
