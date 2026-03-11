import { prisma } from '@foleio/database';

export async function getFanDashboardData(email: string) {
  const normalizedEmail = email.toLowerCase();
  let fanUser: { id: string } | null = null;
  try {
    fanUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
  } catch (error) {
    console.error('[fan-dashboard] user lookup failed:', error);
  }

  let subscriptions: any[] = [];
  try {
    subscriptions = fanUser
      ? await prisma.fanSubscription.findMany({
          where: { fanId: fanUser.id, status: 'active' },
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
      : [];
  } catch (error) {
    console.error('[fan-dashboard] subscriptions query failed:', error);
    subscriptions = [];
  }

  let bookings: any[] = [];
  try {
    bookings = await prisma.booking.findMany({
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
    });
  } catch (error) {
    console.error('[fan-dashboard] bookings query failed:', error);
    bookings = [];
  }

  let tutorials: any[] = [];
  try {
    tutorials = await prisma.tutorialPurchase.findMany({
      where: { email: normalizedEmail },
      include: {
        content: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
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
    });
  } catch (error) {
    console.error('[fan-dashboard] tutorial purchases query failed:', error);
    tutorials = [];
  }

  let collections: any[] = [];
  try {
    collections = await prisma.collectionSubscription.findMany({
      where: { email: normalizedEmail, status: 'active' },
      include: {
        collection: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
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
    });
  } catch (error) {
    console.error('[fan-dashboard] collection subscriptions query failed:', error);
    collections = [];
  }

  let orders: any[] = [];
  try {
    orders = fanUser
      ? await prisma.order.findMany({
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
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    imageUrl: true,
                  },
                },
              },
            },
            deliveryTier: true,
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];
  } catch (error) {
    console.error('[fan-dashboard] orders query failed:', error);
    orders = [];
  }

  return {
    subscriptions,
    bookings,
    orders,
    purchases: {
      tutorials,
      collections,
    },
  };
}
