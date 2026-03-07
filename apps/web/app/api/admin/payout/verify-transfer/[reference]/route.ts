import { isAdminAuthed } from '@/lib/admin/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reference: string }> }
) {
  if (!isAdminAuthed(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.PAYSTACK_SECRET_KEY) {
    return Response.json({ error: 'PAYSTACK_SECRET_KEY is not configured' }, { status: 500 });
  }

  const { reference } = await params;
  if (!reference) {
    return Response.json({ error: 'reference is required' }, { status: 400 });
  }

  const res = await fetch(`https://api.paystack.co/transfer/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  const data = await res.json();
  return Response.json(data, { status: res.ok ? 200 : res.status });
}
