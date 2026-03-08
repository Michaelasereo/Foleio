import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@foleio/database';
import { RateLimiter } from '@/lib/rate-limit/rate-limiter';
import { sendModerationAlertEmail } from '@/lib/email/moderation';

const reportLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
  keyPrefix: 'rate-limit:content-report:',
});

function clientIp(request: NextRequest) {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ip = clientIp(request);
    const rate = await reportLimiter.checkLimit(ip);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many reports. Try again later.' },
        { status: 429 }
      );
    }

    const body = (await request.json()) as {
      reason?: string;
      details?: string;
      email?: string;
    };

    if (!body.reason) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
    }

    const content = await prisma.content.findUnique({
      where: { id },
      include: {
        creator: { include: { user: { select: { email: true } } } },
      },
    });

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    await prisma.contentReport.create({
      data: {
        contentId: id,
        reporterEmail: body.email || null,
        reason: body.reason,
        details: body.details || null,
        status: 'pending',
      },
    });

    const reportCount = await prisma.contentReport.count({
      where: { contentId: id, status: 'pending' },
    });

    if (reportCount >= 3) {
      await prisma.content.update({
        where: { id },
        data: {
          flaggedForReview: true,
          flaggedReason: 'Multiple fan reports',
          flaggedAt: new Date(),
          moderationStatus: 'pending',
        },
      });

      await sendModerationAlertEmail({
        contentId: content.id,
        contentTitle: content.title,
        creatorEmail: content.creator.user.email,
        creatorName: content.creator.displayName,
        reason: 'Multiple fan reports',
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Create content report error:', error);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
}
