import { createRouteHandlerClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUCCESS_STATUSES = ['SUCCESS', 'COMPLETED', 'PAID', 'success', 'completed', 'paid'];

export async function GET() {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        displayName: true,
        username: true,
      },
    });

    if (!creator) {
      return new Response('Creator not found', { status: 404 });
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        creatorId: creator.id,
        status: { in: SUCCESS_STATUSES },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalEarnings = transactions.reduce(
      (sum, transaction) => sum + (Number(transaction.creatorEarnings) || 0),
      0
    );
    const totalFees = transactions.reduce(
      (sum, transaction) => sum + (Number(transaction.platformFee) || 0),
      0
    );

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #1C1008; }
          .header { text-align: center; margin-bottom: 32px; border-bottom: 2px solid #F97316; padding-bottom: 24px; }
          .logo { font-family: Georgia, serif; font-size: 32px; font-weight: bold; color: #F97316; }
          .title { font-size: 20px; font-weight: bold; margin: 8px 0 4px; }
          .subtitle { font-size: 13px; color: #6B5E52; }
          .stats { display: flex; gap: 16px; margin: 24px 0; }
          .stat { flex: 1; padding: 16px; background: #F5F0E8; border-radius: 12px; }
          .stat-label { font-size: 11px; color: #6B5E52; text-transform: uppercase; letter-spacing: 0.5px; }
          .stat-value { font-size: 22px; font-weight: bold; margin-top: 4px; color: #1C1008; }
          table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 13px; }
          th { background: #1C1008; color: white; padding: 10px 12px; text-align: left; font-size: 12px; }
          td { padding: 10px 12px; border-bottom: 1px solid #F0EAE0; }
          tr:nth-child(even) td { background: #FAFAFA; }
          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9E8E82; border-top: 1px solid #F0EAE0; padding-top: 16px; }
          .amount { text-align: right; }
          .type-badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: bold; background: #E5E7EB; color: #374151; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">foleio.</div>
          <div class="title">Earnings Statement</div>
          <div class="subtitle">
            ${creator.displayName || creator.username} (@${creator.username}) ·
            Generated ${new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        <div class="stats">
          <div class="stat">
            <div class="stat-label">Total Earnings</div>
            <div class="stat-value">₦${(totalEarnings / 100).toLocaleString('en-NG')}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Platform Fees</div>
            <div class="stat-value">₦${(totalFees / 100).toLocaleString('en-NG')}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Transactions</div>
            <div class="stat-value">${transactions.length}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Reference</th>
              <th>Type</th>
              <th class="amount">Fan Paid</th>
              <th class="amount">Your Earnings</th>
              <th class="amount">Fee</th>
            </tr>
          </thead>
          <tbody>
            ${transactions
              .map(
                (transaction) => `
                <tr>
                  <td>${new Date(transaction.createdAt).toLocaleDateString('en-NG')}</td>
                  <td style="font-family:monospace;font-size:11px;color:#6B5E52">${transaction.reference || '-'}</td>
                  <td><span class="type-badge">${transaction.type || 'payment'}</span></td>
                  <td class="amount">₦${(Number(transaction.amount || 0) / 100).toLocaleString('en-NG')}</td>
                  <td class="amount" style="color:#16A34A;font-weight:bold">
                    ₦${(Number(transaction.creatorEarnings || 0) / 100).toLocaleString('en-NG')}
                  </td>
                  <td class="amount">₦${(Number(transaction.platformFee || 0) / 100).toLocaleString('en-NG')}</td>
                </tr>
              `
              )
              .join('')}
          </tbody>
        </table>

        <div class="footer">
          foleio.com · Lagos, Nigeria · © ${new Date().getFullYear()} Foleio · hello@foleio.com
        </div>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="foleio-statement-${creator.username}-${new Date().toISOString().split('T')[0]}.html"`,
      },
    });
  } catch (error) {
    console.error('[earnings-export]:', error);
    return Response.json({ error: 'Export failed' }, { status: 500 });
  }
}
