import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';

export async function GET(request: Request) {
  if (!isAdminAuthed(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || '';

  const subscriptions = await prisma.fanSubscription.findMany({
    where: {
      ...(status ? { status } : {}),
    },
    include: {
      fan: { select: { email: true, fullName: true } },
      creator: { select: { displayName: true, username: true } },
      plan: { select: { name: true, price: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return Response.json({ subscriptions });
}

export async function DELETE(request: Request) {
  if (!isAdminAuthed(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as { subscriptionId?: string };
  if (!body.subscriptionId) {
    return Response.json({ error: 'subscriptionId is required' }, { status: 400 });
  }

  const subscription = await prisma.fanSubscription.findUnique({
    where: { id: body.subscriptionId },
    select: { id: true, creatorId: true, status: true },
  });

  if (!subscription) {
    return Response.json({ error: 'Subscription not found' }, { status: 404 });
  }

  await prisma.fanSubscription.update({
    where: { id: subscription.id },
    data: {
      status: 'canceled',
      cancelAtPeriodEnd: true,
    },
  });

  if (subscription.status === 'active') {
    await prisma.creator.update({
      where: { id: subscription.creatorId },
      data: { subscriberCount: { decrement: 1 } },
    });
  }

  return Response.json({ success: true });
}
