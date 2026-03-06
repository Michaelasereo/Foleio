import { NextResponse } from 'next/server';
import { resolveAccountNumber } from '@/lib/services/paystack';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      accountNumber?: string;
      bankCode?: string;
    };

    if (!body.accountNumber || !body.bankCode) {
      return NextResponse.json(
        { error: 'accountNumber and bankCode are required' },
        { status: 400 }
      );
    }

    const result = await resolveAccountNumber(body.accountNumber, body.bankCode);
    if (!result?.status || !result?.data?.account_name) {
      return NextResponse.json({ error: 'Account not found' }, { status: 400 });
    }

    return NextResponse.json({
      accountName: result.data.account_name,
      accountNumber: result.data.account_number,
      bankCode: body.bankCode,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Account verification failed' },
      { status: 500 }
    );
  }
}
