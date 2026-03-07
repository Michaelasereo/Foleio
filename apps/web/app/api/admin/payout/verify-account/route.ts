import { isAdminAuthed } from '@/lib/admin/auth';

export async function POST(request: Request) {
  if (!isAdminAuthed(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.PAYSTACK_SECRET_KEY) {
    return Response.json({ error: 'PAYSTACK_SECRET_KEY is not configured' }, { status: 500 });
  }

  const body = (await request.json()) as { accountNumber?: string; bankCode?: string };
  const accountNumber = (body.accountNumber || '').trim();
  const bankCode = (body.bankCode || '').trim();

  if (!accountNumber || !bankCode) {
    return Response.json({ error: 'accountNumber and bankCode are required' }, { status: 400 });
  }

  const res = await fetch(
    `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
  );
  const data = await res.json();
  return Response.json(data, { status: res.ok ? 200 : res.status });
}
