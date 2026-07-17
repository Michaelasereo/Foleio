import { Check } from 'lucide-react';
import { prisma } from '@foleio/database';
import { FoleioStatusPage } from '@/components/system/FoleioStatusPage';

export const dynamic = 'force-dynamic';

function formatNaira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`;
}

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  const order = orderId
    ? await prisma.order.findUnique({
        where: { id: orderId },
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

  const hasShop = Boolean(order?.creator?.username);

  return (
    <FoleioStatusPage
      title="Order confirmed"
      description="Payment received. Thanks for your order — the creator will handle fulfillment from here."
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
