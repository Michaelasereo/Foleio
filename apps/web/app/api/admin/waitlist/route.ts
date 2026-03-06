import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';

export async function GET(request: Request) {
  if (!isAdminAuthed(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');

  const waitlistModel = (prisma as any).waitlistEntry;
  const entries = waitlistModel
    ? await waitlistModel.findMany({
        orderBy: { createdAt: 'desc' },
      })
    : [];

  if (format === 'csv') {
    const csv = ['Name,Email,Joined']
      .concat(
        entries.map(
          (entry: { name: string; email: string; createdAt: Date }) =>
            `${entry.name},${entry.email},${entry.createdAt.toISOString()}`
        )
      )
      .join('\n');

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="waitlist.csv"',
      },
    });
  }

  return Response.json({ entries });
}
