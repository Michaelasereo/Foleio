import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { assertCreatorApiAccess } from '@/lib/creator/api-session';
import { developerSupportBlockedMessage } from '@/lib/developer-support/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizedEmail(raw: unknown) {
  return String(raw || '').trim().toLowerCase();
}

export async function POST(request: Request) {
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
    const newEmail = normalizedEmail(body?.newEmail);
    const currentPassword = String(body?.currentPassword || '');

    if (!newEmail || !currentPassword) {
      return NextResponse.json(
        { error: 'New email and current password are required' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (newEmail === user.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'New email must be different from your current email' },
        { status: 400 }
      );
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyError) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({
      email: newEmail,
    });
    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Could not update email' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Check your new inbox to confirm this email change.',
    });
  } catch (error) {
    console.error('[creator/account/change-email] failed:', error);
    return NextResponse.json(
      { error: 'Failed to start email change' },
      { status: 500 }
    );
  }
}
