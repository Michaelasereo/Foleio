import { prisma } from '@foleio/database';

export async function getFanDashboardData(email: string) {
  const normalizedEmail = email.toLowerCase();
  const fanUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  const [subscriptions, bookings, tutorials, collections] = await Promise.all([
    fanUser
      ? prisma.fanSubscription.findMany({
          where: { fanId: fanUser.id },
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
            plan: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
    prisma.booking.findMany({
      where: { customerEmail: normalizedEmail },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        priceListItem: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.tutorialPurchase.findMany({
      where: { email: normalizedEmail },
      include: {
        content: {
          select: {
            id: true,
            title: true,
            creator: {
              select: {
                username: true,
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.collectionSubscription.findMany({
      where: { email: normalizedEmail },
      include: {
        collection: {
          select: {
            id: true,
            title: true,
            creator: {
              select: {
                username: true,
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    subscriptions,
    bookings,
    purchases: {
      tutorials,
      collections,
    },
  };
}
