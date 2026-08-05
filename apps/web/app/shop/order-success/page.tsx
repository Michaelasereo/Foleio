import { Check } from 'lucide-react';
import { prisma } from '@foleio/database';
import { confirmPaidShopOrder } from '@/lib/shop/fulfill-order';
import { FoleioStatusPage } from '@/components/system/FoleioStatusPage';

export const dynamic = 'force-dynamic';

function formatNaira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`;
}

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    orderId?: string;
    reference?: string;
    trxref?: string;
  }>;
}) {
  const params = await searchParams;
  const orderId = params.orderId;
  const reference = params.reference || params.trxref || null;

  // Paystack redirects here after payment. Confirm + email even if the webhook is late.
  if (orderId || reference) {
    try {
      await confirmPaidShopOrder({ orderId, reference });
    } catch (error) {
      console.error('[order-success] confirm failed:', error);
    }
  }

  const order = orderId
    ? await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: { include: { product: true } },
          deliveryTier: true,
          creator: { select: { username: true, displayName: true } },
        },
      })
    : reference
      ? await prisma.order.findFirst({
          where: { paystackReference: reference },
          include: {
            items: { include: { product: true } },
            deliveryTier: true,
            creator: { select: { username: true, displayName: true } },
          },
        })
      : null;

  const shopHref = order?.creator?.username
    ? `/creator/${order.creator.username}`
    : '/';

  const deliveryLabel = order
    ? order.deliveryTier?.name ||
      ((order.deliveryAddress as { fulfillment?: string } | null)?.fulfillment ===
      'waived'
        ? 'No delivery'
        : 'Delivery')
    : null;

  const deliveryAddress = (order?.deliveryAddress || {}) as {
    fulfillment?: string;
    merchantContactPhone?: string | null;
  };
  const arrangedContactPhone =
    String(deliveryAddress.merchantContactPhone || '').trim() ||
    String(order?.deliveryTier?.contactPhone || '').trim() ||
    '';
  const isCustomerArranged =
    order?.deliveryTier?.type === 'customer_arranged' ||
    deliveryAddress.fulfillment === 'customer_arranged';

  const hasShop = Boolean(order?.creator?.username);
  const paid =
    order?.status === 'confirmed' ||
    (order?.status === 'pending' && Boolean(reference));

  return (
    <FoleioStatusPage
      title={paid ? 'Order confirmed' : 'Payment received'}
      description={
        paid
          ? 'Thanks for your order — a confirmation email is on its way. Check spam if you do not see it.'
          : 'We are confirming your payment. You will get an email once it clears.'
      }
      icon={<Check strokeWidth={1.75} style={{ width: 24, height: 24 }} />}
      iconTone="ok"
      primaryAction={{
        label: hasShop ? 'Back to shop' : 'Go home',
        href: shopHref,
      }}
      secondaryAction={
        hasShop
          ? {
              label: 'Go home',
              href: '/',
              variant: 'outline',
            }
          : undefined
      }
    >
      {order ? (
        <div
          style={{
            marginTop: 20,
            textAlign: 'left',
            display: 'grid',
            gap: 12,
            padding: 14,
            borderRadius: 10,
            background: '#2b2b2b',
          }}
        >
          <p
            style={{
              margin: 0,
              color: '#f4f4f5',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Order #{order.id.slice(-8).toUpperCase()}
          </p>
          <div style={{ display: 'grid', gap: 6 }}>
            {order.items.map((item) => (
              <p
                key={item.id}
                style={{
                  margin: 0,
                  color: '#adadad',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {item.quantity}× {item.product?.name || 'Product'}
              </p>
            ))}
          </div>
          {deliveryLabel ? (
            <p style={{ margin: 0, color: '#adadad', fontSize: 13 }}>
              Delivery: {deliveryLabel}
            </p>
          ) : null}
          {isCustomerArranged && arrangedContactPhone ? (
            <div
              style={{
                display: 'grid',
                gap: 4,
                padding: 12,
                borderRadius: 8,
                background: '#1f1f1f',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <p style={{ margin: 0, color: '#adadad', fontSize: 12, fontWeight: 600 }}>
                Arrange delivery
              </p>
              <p style={{ margin: 0, color: '#f4f4f5', fontSize: 14, fontWeight: 600 }}>
                Call {order.creator?.displayName || 'the seller'} on {arrangedContactPhone}
              </p>
            </div>
          ) : null}
          <p
            style={{
              margin: 0,
              color: '#f4f4f5',
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            Total {formatNaira(order.total)}
          </p>
        </div>
      ) : null}
    </FoleioStatusPage>
  );
}
