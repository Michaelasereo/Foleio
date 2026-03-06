import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { createTransferRecipient } from '@/lib/services/paystack';
import { serializePrismaObject } from '@/lib/utils/serialization';

export async function POST(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = (await request.json()) as {
      accountNumber?: string;
      bankCode?: string;
      bankName?: string;
      accountName?: string;
    };

    if (!body.accountNumber || !body.bankCode || !body.bankName || !body.accountName) {
      return NextResponse.json({ error: 'Missing required bank fields' }, { status: 400 });
    }

    const creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const recipient = await createTransferRecipient(
      body.accountName,
      body.accountNumber,
      body.bankCode
    );
    if (!recipient?.status || !recipient?.data?.recipient_code) {
      return NextResponse.json(
        { error: recipient?.message || 'Failed to create payout recipient' },
        { status: 400 }
      );
    }

    const bankAccount = await (prisma as any).bankAccount.upsert({
      where: { creatorId: creator.id },
      update: {
        bankCode: body.bankCode,
        bankName: body.bankName,
        accountNumber: body.accountNumber,
        accountName: body.accountName,
        recipientCode: recipient.data.recipient_code,
        isVerified: true,
      },
      create: {
        creatorId: creator.id,
        bankCode: body.bankCode,
        bankName: body.bankName,
        accountNumber: body.accountNumber,
        accountName: body.accountName,
        recipientCode: recipient.data.recipient_code,
        isVerified: true,
      },
    });

    await prisma.creator.update({
      where: { id: creator.id },
      data: {
        bankCode: body.bankCode,
        accountNumber: body.accountNumber,
        accountName: body.accountName,
        bankVerified: true,
      },
    });

    return NextResponse.json({ success: true, bankAccount: serializePrismaObject(bankAccount) });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to save bank account' },
      { status: 500 }
    );
  }
}
