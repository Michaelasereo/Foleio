'use server';

import { createClient } from '@/lib/supabase/server';
import { paystack } from '@/lib/paystack';
import { PrismaClient } from '@foleio/database';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { sendPayoutConfirmation } from '@/lib/email/send';

const prisma = new PrismaClient();

const payoutSchema = z.object({
  amount: z.number().min(1000, 'Minimum payout is ₦10'),
  creatorId: z.string().uuid(),
});

export async function requestPayout(
  prevState: any,
  formData: FormData
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { success: false, message: 'Unauthorized' };
  }

  try {
    const rawData = Object.fromEntries(formData);
    const validatedData = payoutSchema.parse({
      amount: Number(rawData.amount),
      creatorId: rawData.creatorId,
    });

    // Get creator's bank details
    const creator = await prisma.creator.findUnique({
      where: { id: validatedData.creatorId, userId: session.user.id },
      select: {
        paystackRecipientCode: true,
        currentBalance: true,
        accountName: true,
      },
    });

    if (!creator) {
      return { success: false, message: 'Creator not found' };
    }

    if (Number(creator.currentBalance) < validatedData.amount * 100) {
      return { success: false, message: 'Insufficient balance' };
    }

    if (!creator.paystackRecipientCode) {
      return {
        success: false,
        message: 'Bank account not set up. Please complete onboarding.',
      };
    }

    // Initiate transfer via Paystack
    const transfer = await paystack.transfer({
      source: 'balance',
      amount: validatedData.amount * 100, // Convert to kobo
      recipient: creator.paystackRecipientCode,
      reason: 'Foleio platform payout',
    });

    // Record payout in database
    await prisma.payout.create({
      data: {
        creatorId: validatedData.creatorId,
        amount: validatedData.amount * 100,
        status: 'processing',
        paystackTransferCode: transfer.data.transfer_code,
      },
    });

    await sendPayoutConfirmation({
      creatorEmail: session.user.email || '',
      creatorName: creator.accountName || 'Creator',
      amount: validatedData.amount,
      bankName: 'Bank Account',
      accountNumber: creator.paystackRecipientCode || '0000',
      status: 'processing',
    });

    // Update creator balance
    await prisma.creator.update({
      where: { id: validatedData.creatorId },
      data: {
        currentBalance: {
          decrement: validatedData.amount * 100,
        },
      },
    });

    // Revalidate dashboard
    revalidatePath('/dashboard');
    revalidatePath('/creator/payouts');

    return {
      success: true,
      message: `Payout of ${validatedData.amount} initiated successfully`,
    };
  } catch (error) {
    console.error('Payout error:', error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Payout failed',
    };
  }
}

