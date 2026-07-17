import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@foleio/database';
import { isAdminAuthed } from '@/lib/admin/auth';

const createSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Invalid email'),
});

export async function GET(request: Request) {
  if (!isAdminAuthed(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');

  try {
    const entries = await prisma.waitlistEntry.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });

    if (format === 'csv') {
      const csv = ['Name,Email,Status,Joined']
        .concat(
          entries.map(
            (entry) =>
              `${entry.name},${entry.email},${entry.status || 'pending'},${entry.createdAt.toISOString()}`
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
  } catch (error) {
    console.error('Admin waitlist fetch error:', error);
    return Response.json({ error: 'Failed to load waitlist', entries: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid payload' },
        { status: 400 }
      );
    }

    const name = parsed.data.name.trim();
    const email = parsed.data.email.trim().toLowerCase();

    const existing = await prisma.waitlistEntry.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        {
          error: `Already on waitlist as ${existing.status || 'pending'}`,
          entry: existing,
        },
        { status: 409 }
      );
    }

    const entry = await prisma.waitlistEntry.create({
      data: {
        name,
        email,
        status: 'pending',
      },
    });

    return NextResponse.json({ success: true, entry });
  } catch (error: unknown) {
    console.error('Admin waitlist create error:', error);
    if (
      typeof error === 'object' &&
      error &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to add invite' }, { status: 500 });
  }
}
