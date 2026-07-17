import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAdminAuthed(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || '';

  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status } : {}),
    },
    include: {
      creator: { select: { displayName: true, username: true } },
      items: {
        include: { product: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const mapped = orders.map((order) => {
    const address = (order.deliveryAddress || {}) as Record<string, string>;
    return {
      id: order.id,
      status: order.status,
      total: order.total,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      createdAt: order.createdAt,
      customerName: address.name || null,
      customerEmail: address.email || null,
      creator: order.creator,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      itemSummary: order.items
        .map((item) => `${item.quantity}x ${item.product?.name || 'Product'}`)
        .join(', '),
    };
  });

  return Response.json({ orders: mapped });
}
