import { isAdminAuthed } from '@/lib/admin/auth';

export async function POST(request: Request) {
  if (!isAdminAuthed(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.PAYSTACK_SECRET_KEY) {
    return Response.json({ error: 'PAYSTACK_SECRET_KEY is not configured' }, { status: 500 });
  }

  const body = (await request.json()) as {
    name?: string;
    accountNumber?: string;
    bankCode?: string;
  };
  const name = (body.name || '').trim();
  const accountNumber = (body.accountNumber || '').trim();
  const bankCode = (body.bankCode || '').trim();

  if (!name || !accountNumber || !bankCode) {
    return Response.json(
      { error: 'name, accountNumber, and bankCode are required' },
      { status: 400 }
    );
  }

  const res = await fetch('https://api.paystack.co/transferrecipient', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'nuban',
      name,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: 'NGN',
    }),
  });
  const data = await res.json();
  return Response.json(data, { status: res.ok ? 200 : res.status });
}
