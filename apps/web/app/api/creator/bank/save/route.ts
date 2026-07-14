import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { createTransferRecipient } from '@/lib/services/paystack';
import { paystack } from '@/lib/paystack';
import { serializePrismaObject } from '@/lib/utils/serialization';
import { isDojahKycRequired } from '@/lib/config/platform-settings';
import { feePercentForCreator } from '@/lib/billing/platform-fee';

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
      select: {
        id: true,
        displayName: true,
        username: true,
        bvnVerified: true,
        paystackSubaccountCode: true,
        platformPlan: true,
        platformSubscriptionActive: true,
        user: {
          select: {
            email: true,
            phoneNumber: true,
          },
        },
      },
    });
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    if ((await isDojahKycRequired()) && !creator.bvnVerified) {
      return NextResponse.json(
        {
          error:
            'Complete identity verification (Step 1) before adding a bank account.',
        },
        { status: 400 }
      );
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

    const contactEmail = creator.user?.email || user.email || `${creator.username}@foleio.com`;
    const contactName = creator.displayName || body.accountName;
    const contactPhone = creator.user?.phoneNumber || '08000000000';
    const percentageCharge = feePercentForCreator(creator);

    let subaccountCode = creator.paystackSubaccountCode;
    let subaccountStatus: 'ACTIVE' | 'PENDING_CREATION' | 'INACTIVE' = 'PENDING_CREATION';

    try {
      if (subaccountCode) {
        await paystack.updateSubaccount({
          subaccount_code: subaccountCode,
          business_name: contactName,
          settlement_bank: body.bankCode,
          account_number: body.accountNumber,
          percentage_charge: percentageCharge,
          primary_contact_email: contactEmail,
          primary_contact_name: contactName,
          primary_contact_phone: contactPhone,
          settlement_schedule: 'auto',
        });
        subaccountStatus = 'ACTIVE';
      } else {
        const created = await paystack.createSubaccount({
          business_name: contactName,
          settlement_bank: body.bankCode,
          account_number: body.accountNumber,
          percentage_charge: percentageCharge,
          primary_contact_email: contactEmail,
          primary_contact_name: contactName,
          primary_contact_phone: contactPhone,
          settlement_schedule: 'auto',
        });
        subaccountCode = created?.data?.subaccount_code || null;
        if (!subaccountCode) {
          throw new Error(created?.message || 'Paystack did not return a subaccount code');
        }
        subaccountStatus = 'ACTIVE';
      }
    } catch (subaccountError: any) {
      console.error('[bank/save] subaccount error:', subaccountError);
      return NextResponse.json(
        {
          error:
            subaccountError?.message ||
            'Bank saved locally but Paystack subaccount setup failed. Please try again.',
        },
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
        paystackSubaccountCode: subaccountCode,
        subaccountStatus,
        payoutMethod: 'DIRECT_SUBACCOUNT',
      },
    });

    return NextResponse.json({
      success: true,
      bankAccount: serializePrismaObject(bankAccount),
      paystackSubaccountCode: subaccountCode,
      subaccountStatus,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to save bank account' },
      { status: 500 }
    );
  }
}
