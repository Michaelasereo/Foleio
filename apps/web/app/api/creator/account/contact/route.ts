import { NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { assertCreatorApiAccess } from '@/lib/creator/api-session';
import { developerSupportBlockedMessage } from '@/lib/developer-support/guard';
import { toWhatsAppDigits } from '@/lib/quotes/helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  try {
    const accessResult = await assertCreatorApiAccess(request);
    if (!accessResult.ok) {
      return NextResponse.json(
        { error: accessResult.error },
        { status: accessResult.status }
      );
    }
    if (accessResult.access.mode === 'support') {
      return NextResponse.json(
        { error: developerSupportBlockedMessage() },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawPhone = String(body?.phoneNumber || '').trim();
    const phoneNumber = rawPhone ? toWhatsAppDigits(rawPhone) : null;

    if (rawPhone && !phoneNumber) {
      return NextResponse.json(
        { error: 'Enter a valid WhatsApp number' },
        { status: 400 }
      );
    }

    const creator = await prisma.creator.findUnique({
      where: { id: accessResult.access.creator.id },
      select: { userId: true },
    });
    if (!creator?.userId) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: creator.userId },
      data: { phoneNumber },
    });

    return NextResponse.json({
      success: true,
      phoneNumber,
    });
  } catch (error) {
    console.error('[creator/account/contact] failed:', error);
    return NextResponse.json(
      { error: 'Failed to save contact details' },
      { status: 500 }
    );
  }
}
