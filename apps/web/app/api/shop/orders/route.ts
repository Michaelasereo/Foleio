import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type OrderItemInput = {
  productId?: string;
  variantSelected?: Record<string, string>;
  quantity?: number;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const creatorId = String(body?.creatorId || '').trim();
    const deliveryAddress = (body?.deliveryAddress || {}) as Record<string, string>;
    const items = Array.isArray(body?.items) ? (body.items as OrderItemInput[]) : [];

    if (!creatorId || items.length === 0) {
      return NextResponse.json({ error: 'Invalid order payload' }, { status: 400 });
    }

    const productIds = [...new Set(items.map((item) => String(item.productId || '').trim()).filter(Boolean))];
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        creatorId,
        status: 'active',
      },
    });

    if (products.length === 0) {
      return NextResponse.json({ error: 'No valid products in cart' }, { status: 400 });
    }

    const hasPhysical = products.some((product) => product.type === 'physical');

    const mappedItems = items
      .map((item) => {
        const productId = String(item.productId || '').trim();
        const product = products.find((entry) => entry.id === productId);
        if (!product) return null;
        const quantity = Math.max(1, Number(item.quantity || 1));
        return {
          productId,
          quantity,
          variantSelected: item.variantSelected || undefined,
          unitPrice: product.price,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (mappedItems.length === 0) {
      return NextResponse.json({ error: 'No valid products in cart' }, { status: 400 });
    }

    const subtotal = mappedItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    let deliveryTierId: string | null = null;
    let deliveryFee = 0;
    if (hasPhysical) {
      const requestedDeliveryTierId = String(body?.deliveryTierId || '').trim();
      if (!requestedDeliveryTierId) {
        return NextResponse.json({ error: 'Delivery tier is required for physical products' }, { status: 400 });
      }

      const deliveryTier = await prisma.deliveryTier.findFirst({
        where: { id: requestedDeliveryTierId, creatorId },
      });
      if (!deliveryTier) {
        return NextResponse.json({ error: 'Invalid delivery tier' }, { status: 400 });
      }
      deliveryTierId = deliveryTier.id;
      deliveryFee = deliveryTier.flatRate;
    }

    const total = subtotal + deliveryFee;
    if (total <= 0) {
      return NextResponse.json({ error: 'Invalid order total' }, { status: 400 });
    }

    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const fanId = user?.id || 'guest';

    const order = await prisma.order.create({
      data: {
        id: crypto.randomUUID(),
        fanId,
        creatorId,
        deliveryTierId,
        deliveryAddress,
        subtotal,
        deliveryFee,
        total,
        status: 'pending',
        items: {
          createMany: {
            data: mappedItems.map((item) => ({
              id: crypto.randomUUID(),
              productId: item.productId,
              variantSelected: item.variantSelected,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
      },
      include: {
        items: true,
      },
    });

    const reference = `shop_${order.id}_${Date.now()}`;
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: deliveryAddress.email,
        amount: total,
        reference,
        metadata: {
          type: 'shop_order',
          orderId: order.id,
          creatorId,
          fanId,
          custom_fields: [
            {
              display_name: 'Order ID',
              variable_name: 'order_id',
              value: order.id,
            },
          ],
        },
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/shop/order-success?orderId=${order.id}`,
      }),
    });

    const paystackData = await paystackRes.json();
    const paystackReference = paystackData?.data?.reference || reference;

    await prisma.order.update({
      where: { id: order.id },
      data: { paystackReference },
    });

    return NextResponse.json({
      orderId: order.id,
      paystackUrl: paystackData?.data?.authorization_url || null,
      reference: paystackReference,
    });
  } catch (error) {
    console.error('[shop/orders][POST] failed:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
