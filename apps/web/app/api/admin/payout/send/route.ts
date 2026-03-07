import { isAdminAuthed } from '@/lib/admin/auth';

export async function POST(request: Request) {
  if (!isAdminAuthed(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.PAYSTACK_SECRET_KEY) {
    return Response.json({ error: 'PAYSTACK_SECRET_KEY is not configured' }, { status: 500 });
  }

  const body = (await request.json()) as {
    recipientCode?: string;
    amount?: number;
    reason?: string;
  };
  const recipientCode = (body.recipientCode || '').trim();
  const amount = Number(body.amount || 0);
  const reason = (body.reason || 'Foleio payout test').trim();

  if (!recipientCode || amount <= 0) {
    return Response.json({ error: 'recipientCode and valid amount are required' }, { status: 400 });
  }

  const reference = `foleio_payout_test_${Date.now()}`;
  const res = await fetch('https://api.paystack.co/transfer', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'balance',
      amount: Math.round(amount * 100),
      recipient: recipientCode,
      reference,
      reason,
    }),
  });
  const data = await res.json();
  return Response.json(data, { status: res.ok ? 200 : res.status });
}
