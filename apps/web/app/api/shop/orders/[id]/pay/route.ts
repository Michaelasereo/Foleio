import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { paystack } from '@/lib/paystack';
import { isPaymentsReady } from '@/lib/creator/payments-ready';
import { isDojahKycRequired } from '@/lib/config/platform-settings';
import {
  paystackTransactionChargeKobo,
  toFeePlanInput,
  PLATFORM_SUB_FEE_SELECT,
} from '@/lib/billing/platform-fee';
import {
  isBelowMinPayableKobo,
  minPayableChargeError,
} from '@/lib/payments/min-amount';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STOCK_GONE_MESSAGE =
  'Some items are no longer available — please shop again.';

function isNonPhysicalProductType(type: string | null | undefined) {
  return type === 'digital' || type === 'gift_card';
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                type: true,
                stock: true,
                status: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            bvnVerified: true,
            paystackSubaccountCode: true,
            subaccountStatus: true,
            platformPlan: true,
            platformSubscriptionActive: true,
            platformSubscriptions: {
              select: PLATFORM_SUB_FEE_SELECT,
              take: 1,
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: 'Order is not awaiting payment' },
        { status: 400 }
      );
    }

    const chargeAmount = Math.max(0, Math.round(Number(order.total) || 0));
    if (chargeAmount <= 0) {
      return NextResponse.json(
        { error: 'This order has no amount due' },
        { status: 400 }
      );
    }

    if (isBelowMinPayableKobo(chargeAmount)) {
      return NextResponse.json(
        { error: minPayableChargeError({ afterGiftCard: false }) },
        { status: 400 }
      );
    }

    for (const item of order.items) {
      const product = item.product;
      if (!product || product.status !== 'active') {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'cancelled' },
        });
        return NextResponse.json(
          {
            error: STOCK_GONE_MESSAGE,
            shopHref: order.creator.username
              ? `/creator/${order.creator.username}`
              : '/',
          },
          { status: 409 }
        );
      }
      const isNonPhysical = isNonPhysicalProductType(product.type);
      const stock = product.stock;
      if (!isNonPhysical || stock != null) {
        const available = isNonPhysical ? stock ?? Infinity : stock ?? 0;
        if (available < item.quantity) {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: 'cancelled' },
          });
          return NextResponse.json(
            {
              error: STOCK_GONE_MESSAGE,
              shopHref: order.creator.username
                ? `/creator/${order.creator.username}`
                : '/',
            },
            { status: 409 }
          );
        }
      }
    }

    const creator = order.creator;
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

    const address = (order.deliveryAddress || {}) as { email?: string };
    const email = String(address.email || '').trim();
    if (!email) {
      return NextResponse.json(
        { error: 'Order is missing a customer email' },
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
            'This creator’s payout account is out of sync with Paystack. They need to re-save bank details, then try again.',
        },
        { status: 400 }
      );
    }

    let paymentData;
    try {
      const transactionCharge = paystackTransactionChargeKobo(
        chargeAmount,
        toFeePlanInput(creator)
      );
      paymentData = await paystack.initializePayment({
        email,
        amount: chargeAmount,
        channels: ['card', 'bank', 'ussd', 'bank_transfer', 'qr'],
        subaccount: subaccountCode,
        transaction_charge: transactionCharge,
        metadata: {
          type: 'shop_order',
          orderId: order.id,
          creatorId: order.creatorId,
          fanId: order.fanId,
          paymentType: 'DIRECT_SUBACCOUNT',
          ...(transactionCharge
            ? { platformFeeType: 'flat', platformFeeKobo: transactionCharge }
            : {}),
        },
        callback_url: `${
          process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com'
        }/shop/order-success?orderId=${order.id}`,
      });
    } catch (initError) {
      const message = initError instanceof Error ? initError.message : String(initError);
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
    console.error('[shop/orders/:id/pay][POST] failed:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to resume payment',
      },
      { status: 500 }
    );
  }
}
