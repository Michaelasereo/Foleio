import Link from 'next/link';
import { prisma } from '@foleio/database';

export const dynamic = 'force-dynamic';

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
        },
      })
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
      <div className="rounded-2xl border bg-card p-6">
        <h1 className="text-2xl font-semibold">Order confirmed!</h1>
        <p className="mt-2 text-muted-foreground">
          Thank you for your order. Payment has been received successfully.
        </p>
      </div>

      {order ? (
        <div className="space-y-4 rounded-2xl border bg-card p-6">
          <p className="font-medium">Order #{order.id.slice(-8).toUpperCase()}</p>
          <div className="space-y-1 text-sm">
            {order.items.map((item) => (
              <p key={item.id}>
                {item.quantity}x {item.product?.name || 'Product'}
              </p>
            ))}
          </div>
          <p className="text-sm">
            Delivery: {order.deliveryTier?.name || 'Digital delivery'}
          </p>
          <p className="font-semibold">
            Total: ₦{(order.total / 100).toLocaleString('en-NG')}
          </p>
          <p className="text-sm text-muted-foreground">
            Track your order in your dashboard.
          </p>
          <Link href="/fan/dashboard" className="text-sm font-medium text-primary hover:underline">
            Go to fan dashboard →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
