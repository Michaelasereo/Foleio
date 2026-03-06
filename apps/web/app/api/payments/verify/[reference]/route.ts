import { NextRequest, NextResponse } from 'next/server';
import { paystack } from '@/lib/paystack';
import { PrismaClient } from '@foleio/database';
import { z } from 'zod';

const prisma = new PrismaClient();

const paramsSchema = z.object({
  reference: z.string().min(1),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const { reference } = paramsSchema.parse(await params);

    // Verify payment with Paystack
    const verification = await paystack.verifyPayment(reference);

    if (!verification.status) {
      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 400 }
      );
    }

    // Update transaction status
    const transaction = await prisma.transaction.findUnique({
      where: { reference },
    });

    if (transaction) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: verification.data.status === 'success' ? 'success' : 'failed',
          gatewayResponse: verification.data,
        },
      });
    }

    return NextResponse.json({
      success: verification.data.status === 'success',
      data: verification.data,
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Payment verification failed',
      },
      { status: 500 }
    );
  }
}

