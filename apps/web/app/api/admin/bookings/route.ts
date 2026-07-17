import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';
import { bookingAmountForAdmin } from '@/lib/admin/stats-helpers';

export async function GET(request: Request) {
  if (!isAdminAuthed(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || '';

  const bookings = await prisma.booking.findMany({
    where: {
      ...(status ? { status } : {}),
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
