import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { verifyBVNMatch } from '@/lib/services/paystack';

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

    const body = (await request.json()) as { bvn?: string };
    if (!body.bvn || body.bvn.length !== 11) {
      return NextResponse.json({ error: 'Enter a valid 11-digit BVN' }, { status: 400 });
    }

    const creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const bankAccount = await (prisma as any).bankAccount.findUnique({
      where: { creatorId: creator.id },
    });
    if (!bankAccount) {
      return NextResponse.json({ error: 'Add bank account first' }, { status: 400 });
    }

    const verification = await verifyBVNMatch(
      body.bvn,
      bankAccount.accountNumber,
      bankAccount.bankCode
    );

    const verified = Boolean(verification?.status && verification?.data?.account_number);
    if (!verified) {
      return NextResponse.json(
        { verified: false, error: verification?.message || 'BVN verification failed' },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.creator.update({
        where: { id: creator.id },
        data: {
          bvnVerified: true,
          identityVerifiedAt: new Date(),
        },
      }),
      (prisma as any).bankAccount.update({
        where: { creatorId: creator.id },
        data: { bvnVerified: true },
      }),
    ]);

    return NextResponse.json({ verified: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'BVN verification failed' },
      { status: 500 }
    );
  }
}
