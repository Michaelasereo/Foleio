import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';

export async function GET(request: Request) {
  if (!isAdminAuthed(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page') || '1'));
  const type = searchParams.get('type') || '';
  const status = searchParams.get('status') || '';
  const paymentType = searchParams.get('paymentType') || '';
  const q = searchParams.get('q') || '';

  const statusFilter = status
    ? status.toLowerCase() === 'success'
      ? { status: { in: ['success', 'SUCCESS', 'completed', 'COMPLETED', 'paid', 'PAID'] } }
      : status.toLowerCase() === 'pending'
        ? { status: { in: ['pending', 'PENDING'] } }
        : status.toLowerCase() === 'failed'
          ? { status: { in: ['failed', 'FAILED'] } }
          : { status }
    : {};

  const where = {
    ...statusFilter,
    ...(type ? { type } : {}),
    ...(paymentType ? { paymentType: paymentType as 'DIRECT_SUBACCOUNT' | 'PLATFORM_HELD' } : {}),
    ...(q
      ? {
          OR: [
            { creator: { displayName: { contains: q, mode: 'insensitive' as const } } },
            { creator: { username: { contains: q, mode: 'insensitive' as const } } },
            { user: { email: { contains: q, mode: 'insensitive' as const } } },
            { reference: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        creator: { select: { displayName: true, username: true } },
        user: { select: { email: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      skip: (page - 1) * 50,
    }),
    prisma.transaction.count({ where }),
  ]);

  return Response.json({
    transactions,
    page,
    pageSize: 50,
    total,
    totalPages: Math.ceil(total / 50),
  });
}
