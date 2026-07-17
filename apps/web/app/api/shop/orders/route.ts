import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { paystack } from '@/lib/paystack';
import { isPaymentsReady } from '@/lib/creator/payments-ready';
import { isDojahKycRequired } from '@/lib/config/platform-settings';
import {
  flattenAddonOptions,
  parseAddonCategories,
  validateRequiredAddons,
  type AddonOption,
} from '@/lib/shop/product-addons';
import { resolveProductPricing } from '@/lib/shop/preorder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type OrderItemInput = {
  productId?: string;
  variantSelected?: Record<string, string>;
  addonIds?: string[];
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

    const firstName = String(
      deliveryAddress.firstName || deliveryAddress.first_name || ''
    ).trim();
    const lastName = String(
      deliveryAddress.lastName || deliveryAddress.last_name || ''
    ).trim();
    const name =
      `${firstName} ${lastName}`.trim() || String(deliveryAddress.name || '').trim();
    const email = String(deliveryAddress.email || '').trim();
    const phone = String(deliveryAddress.phone || '').trim();
    const notes = String(deliveryAddress.notes || '').trim();
    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { error: 'First name, last name, email, and phone are required' },
        { status: 400 }
      );
    }

    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      select: {
        id: true,
        bvnVerified: true,
        paystackSubaccountCode: true,
        subaccountStatus: true,
        platformPlan: true,
        platformSubscriptionActive: true,
      },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const subaccountCode = creator.paystackSubaccountCode;
    if (
      !isPaymentsReady(creator, {
        requireKyc: await isDojahKycRequired(),
      }) ||
      !subaccountCode
    ) {
      return NextResponse.json(
        {
          error:
            'This creator has not finished payment setup. Shop orders cannot be charged yet.',
        },
        { status: 400 }
      );
    }

    const existingSubaccount = await paystack.getSubaccount(subaccountCode);
    if (!existingSubaccount) {
      await prisma.creator.update({
        where: { id: creator.id },
        data: { subaccountStatus: 'INACTIVE' },
      });
      return NextResponse.json(
        {
          error:
            'This creator’s payout account is out of sync with Paystack. They need to re-save bank details.',
        },
        { status: 400 }
      );
    }

    const productIds = [
      ...new Set(items.map((item) => String(item.productId || '').trim()).filter(Boolean)),
    ];
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        creatorId,
        status: 'active',
      },
      include: { variants: true },
    });

    if (products.length === 0) {
      return NextResponse.json({ error: 'No valid products in cart' }, { status: 400 });
    }

    const mappedItems: Array<{
      productId: string;
      quantity: number;
      variantSelected?: Record<string, string>;
      addonsSelected: AddonOption[];
      unitPrice: number;
    }> = [];

    for (const item of items) {
      const productId = String(item.productId || '').trim();
      const product = products.find((entry) => entry.id === productId);
      if (!product) {
        return NextResponse.json({ error: 'Invalid product in cart' }, { status: 400 });
      }

      const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
      const stock = product.stock ?? 0;
      if (stock < quantity) {
        return NextResponse.json(
          { error: `${product.name} does not have enough stock` },
          { status: 400 }
        );
      }

      const selectedVariants = (item.variantSelected || {}) as Record<string, string>;
      for (const variant of product.variants) {
        const chosen = selectedVariants[variant.name];
        if (!chosen || !variant.options.includes(chosen)) {
          return NextResponse.json(
            { error: `Select ${variant.name} for ${product.name}` },
            { status: 400 }
          );
        }
      }

      const addonCategories = parseAddonCategories(product.addons);
      const catalogAddons = flattenAddonOptions(addonCategories);
      const requestedAddonIds = Array.isArray(item.addonIds)
        ? item.addonIds.map(String)
        : [];
      const requiredError = validateRequiredAddons(addonCategories, requestedAddonIds);
      if (requiredError) {
        return NextResponse.json(
          { error: `${requiredError} for ${product.name}` },
          { status: 400 }
        );
      }
      const addonsSelected = catalogAddons.filter((addon) =>
        requestedAddonIds.includes(addon.id)
      );
      const addonsTotal = addonsSelected.reduce((sum, addon) => sum + addon.price, 0);
      const pricing = resolveProductPricing({
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        isPreorder: Boolean(product.isPreorder),
        preorderSettings: product.preorderSettings,
      });
      const unitPrice = pricing.price + addonsTotal;

      mappedItems.push({
        productId,
        quantity,
        variantSelected:
          Object.keys(selectedVariants).length > 0 ? selectedVariants : undefined,
        addonsSelected,
        unitPrice,
      });
    }

    let deliveryTierId: string | null = null;
    let deliveryFee = 0;
    let deliveryType: string | null = null;

    {
      const requestedDeliveryTierId = String(body?.deliveryTierId || '').trim();
      if (!requestedDeliveryTierId) {
        return NextResponse.json(
          { error: 'Delivery option is required' },
          { status: 400 }
        );
      }

      const deliveryTier = await prisma.deliveryTier.findFirst({
        where: { id: requestedDeliveryTierId, creatorId },
      });
      if (!deliveryTier) {
        return NextResponse.json({ error: 'Invalid delivery option' }, { status: 400 });
      }

      deliveryTierId = deliveryTier.id;
      deliveryType = deliveryTier.type || 'paid';
      deliveryFee =
        deliveryType === 'paid' ? Math.max(0, Number(deliveryTier.flatRate) || 0) : 0;

      if (deliveryType !== 'pickup') {
        const address = String(deliveryAddress.address || '').trim();
        const city = String(deliveryAddress.city || '').trim();
        const state = String(deliveryAddress.state || '').trim();
        if (!address || !city || !state) {
          return NextResponse.json(
            { error: 'Delivery address, city, and state are required' },
            { status: 400 }
          );
        }
      }
    }

    const subtotal = mappedItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const total = subtotal + deliveryFee;
    if (total < 100) {
      return NextResponse.json({ error: 'Invalid order total' }, { status: 400 });
    }

    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const fanId = user?.id || 'guest';

    const normalizedAddress = {
      firstName,
      lastName,
      name,
      email,
      phone,
      notes,
      address: String(deliveryAddress.address || '').trim(),
      city: String(deliveryAddress.city || '').trim(),
      state: String(deliveryAddress.state || '').trim(),
      fulfillment: deliveryType || 'delivery',
    };

    const order = await prisma.order.create({
      data: {
        id: crypto.randomUUID(),
        fanId,
        creatorId,
        deliveryTierId,
        deliveryAddress: normalizedAddress,
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
              addonsSelected: item.addonsSelected,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
      },
    });

    let paymentData;
    try {
      paymentData = await paystack.initializePayment({
        email,
        amount: total,
        channels: ['card', 'bank', 'ussd'],
        subaccount: subaccountCode,
        metadata: {
          type: 'shop_order',
          orderId: order.id,
          creatorId,
          fanId,
          paymentType: 'DIRECT_SUBACCOUNT',
        },
        callback_url: `${
          process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com'
        }/shop/order-success?orderId=${order.id}`,
      });
    } catch (initError) {
      const message = initError instanceof Error ? initError.message : String(initError);
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'cancelled' },
      });
      if (/invalid subaccount/i.test(message)) {
        await prisma.creator.update({
          where: { id: creator.id },
          data: { subaccountStatus: 'INACTIVE' },
        });
        return NextResponse.json(
          {
            error:
              'Payment split failed: creator Paystack subaccount is invalid for this environment.',
          },
          { status: 400 }
        );
      }
      throw initError;
    }

    if (!paymentData?.status || !paymentData?.data) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'cancelled' },
      });
      throw new Error(paymentData?.message || 'Payment initialization failed');
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { paystackReference: paymentData.data.reference },
    });

    return NextResponse.json({
      orderId: order.id,
      paystackUrl: paymentData.data.authorization_url,
      reference: paymentData.data.reference,
    });
  } catch (error) {
    console.error('[shop/orders][POST] failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create order',
      },
      { status: 500 }
    );
  }
}
