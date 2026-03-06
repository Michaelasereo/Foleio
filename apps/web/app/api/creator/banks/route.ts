import { NextResponse } from 'next/server';
import { getBankList } from '@/lib/services/paystack';

export async function GET() {
  try {
    const result = await getBankList();
    if (!result?.status) {
      return NextResponse.json({ error: 'Failed to load bank list' }, { status: 500 });
    }

    const banks = (result?.data || []).map((bank: any) => ({
      name: bank.name,
      code: bank.code,
      slug: bank.slug,
    }));

    return NextResponse.json(
      { banks },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch banks' },
      { status: 500 }
    );
  }
}
