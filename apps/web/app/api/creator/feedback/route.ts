import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/resend';
import { baseEmailTemplate } from '@/lib/email/base-template';
import { FOLEIO_SUPPORT_EMAIL } from '@/lib/config/support';

export const dynamic = 'force-dynamic';

const schema = z.object({
  category: z.enum(['feedback', 'bug', 'question', 'other']),
  message: z.string().trim().min(10).max(4000),
});

const CATEGORY_LABELS: Record<z.infer<typeof schema>['category'], string> = {
  feedback: 'Product feedback',
  bug: 'Bug report',
  question: 'Question',
  other: 'Other',
};

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

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid feedback' },
        { status: 400 }
      );
    }

    const creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        displayName: true,
        username: true,
        user: { select: { email: true } },
      },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const supportTo =
      process.env.SUPPORT_EMAIL?.trim() ||
      process.env.ADMIN_NOTIFICATION_EMAIL?.trim() ||
      FOLEIO_SUPPORT_EMAIL;

    const categoryLabel = CATEGORY_LABELS[parsed.data.category];
    const replyEmail = creator.user?.email || user.email || 'unknown';
    const subject = `[Foleio ${categoryLabel}] ${creator.displayName} (@${creator.username})`;
    const html = baseEmailTemplate({
      previewText: `New ${categoryLabel.toLowerCase()} from ${creator.displayName}`,
      body: `
        <h2 style="margin:0 0 12px;font-size:22px;color:#1C1008;">New creator message</h2>
        <p style="margin:0 0 8px;font-size:14px;color:#6B5E52;"><strong>From:</strong> ${creator.displayName} (@${creator.username})</p>
        <p style="margin:0 0 8px;font-size:14px;color:#6B5E52;"><strong>Email:</strong> ${replyEmail}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#6B5E52;"><strong>Creator ID:</strong> ${creator.id}</p>
        <p style="margin:0 0 16px;font-size:14px;color:#6B5E52;"><strong>Topic:</strong> ${categoryLabel}</p>
        <div style="padding:16px;border-radius:12px;background:#F5F0E8;white-space:pre-wrap;font-size:14px;color:#1C1008;line-height:1.6;">${escapeHtml(parsed.data.message)}</div>
      `,
    });

    const result = await sendEmail({
      to: supportTo,
      subject,
      html,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error:
            ('error' in result && result.error) ||
            'Could not send your message. Please email us directly.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[creator/feedback]', error);
    return NextResponse.json(
      { error: 'Failed to send feedback' },
      { status: 500 }
    );
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
