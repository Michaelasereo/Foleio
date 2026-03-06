import { Handler } from '@netlify/functions';
import { PrismaClient } from '@foleio/database';
import { paystack } from '../../apps/web/lib/paystack';

const prisma = new PrismaClient();

const handler: Handler = async (event, context) => {
  // Ensure this is a scheduled event
  if (event.headers['x-netlify-scheduled'] !== 'true') {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  try {
    // Get creators with pending payouts
    const creators = await prisma.creator.findMany({
      where: {
        currentBalance: {
          gte: 10000, // Minimum ₦100
        },
        paystackRecipientCode: {
          not: null,
        },
      },
      select: {
        id: true,
        paystackRecipientCode: true,
        currentBalance: true,
      },
    });

    const results = [];

    for (const creator of creators) {
      try {
        // Initiate transfer
        const transfer = await paystack.transfer({
          source: 'balance',
          amount: Number(creator.currentBalance),
          recipient: creator.paystackRecipientCode!,
          reason: 'Daily payout from Foleio',
        });

        // Record payout
        await prisma.payout.create({
          data: {
            creatorId: creator.id,
            amount: Number(creator.currentBalance),
            status: 'processing',
            paystackTransferCode: transfer.data.transfer_code,
          },
        });

        // Reset creator balance
        await prisma.creator.update({
          where: { id: creator.id },
          data: { currentBalance: 0 },
        });

        results.push({
          creator_id: creator.id,
          amount: Number(creator.currentBalance) / 100,
          status: 'success',
        });
      } catch (error) {
        console.error(`Failed payout for creator ${creator.id}:`, error);
        results.push({
          creator_id: creator.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'failed',
        });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Payouts processed',
        results,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Payout processing error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

export { handler };

