import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';
import { e2eCreatorIds, withoutE2eCreator } from '@/lib/admin/delete-creator';
import { bookingAmountForAdmin } from '@/lib/admin/stats-helpers';

export async function GET(request: Request) {
  if (!isAdminAuthed(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || '';
  const excluded = await e2eCreatorIds();

  const bookings = await prisma.booking.findMany({
    where: {
      ...(status ? { status } : {}),
      ...withoutE2eCreator(excluded),
    },
    include: {
      creator: { select: { displayName: true, username: true } },
      priceListItem: { select: { name: true, price: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const mapped = bookings.map((booking) => ({
    ...booking,
    amount: bookingAmountForAdmin(booking),
  }));

  return Response.json({ bookings: mapped });
}
