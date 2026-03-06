import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';

export async function GET(request: Request) {
  if (!isAdminAuthed(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const platformSubs = await prisma.platformSubscription.findMany({
    include: {
      creator: {
        select: {
          displayName: true,
          username: true,
          platformPlan: true,
          user: { select: { email: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json({ platformSubs });
}
