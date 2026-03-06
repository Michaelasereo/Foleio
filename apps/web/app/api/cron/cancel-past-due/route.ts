import { prisma } from '@foleio/database';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const expiredSubs = await prisma.fanSubscription.findMany({
    where: {
      status: 'past_due',
      updatedAt: { lte: sevenDaysAgo },
    },
    include: {
      creator: { select: { id: true } },
    },
  });

  for (const sub of expiredSubs) {
    await prisma.fanSubscription.update({
      where: { id: sub.id },
      data: { status: 'canceled' },
    });

    await prisma.creator.update({
      where: { id: sub.creatorId },
      data: {
        subscriberCount: { decrement: 1 },
      },
    });
  }

  return Response.json({
    cancelled: expiredSubs.length,
    success: true,
  });
}
