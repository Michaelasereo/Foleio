import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/admin/auth';
import {
  deleteCreatorById,
  deleteE2eCreatorByEmail,
  deleteE2eWaitlistEntries,
  findE2eCreatorIds,
} from '@/lib/admin/delete-creator';

export async function GET(request: NextRequest) {
  try {
    if (!isAdminAuthed(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const matches = await findE2eCreatorIds();
    return NextResponse.json({ count: matches.length, matches });
  } catch (error) {
    console.error('Admin list e2e creators error:', error);
    return NextResponse.json({ error: 'Failed to list e2e creators' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdminAuthed(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      confirm?: string;
      email?: string;
    };
    if (body.confirm !== 'DELETE_E2E') {
      return NextResponse.json(
        { error: 'confirm must be DELETE_E2E' },
        { status: 400 }
      );
    }

    // Single invite/email cleanup from the Invites page
    if (body.email) {
      try {
        const result = await deleteE2eCreatorByEmail(body.email);
        return NextResponse.json({
          success: true,
          deletedCount: result.deletedCreator ? 1 : 0,
          waitlistDeleted: result.waitlistDeleted,
          deleted: result.deletedCreator ? [result.deletedCreator] : [],
          failed: [],
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'NOT_E2E_EMAIL') {
          return NextResponse.json(
            { error: 'Email does not look like an e2e account' },
            { status: 400 }
          );
        }
        throw error;
      }
    }

    const matches = await findE2eCreatorIds();
    const deleted: Array<{ id: string; username: string; email: string }> = [];
    const failed: Array<{ id: string; username: string; error: string }> = [];

    for (const match of matches) {
      try {
        const result = await deleteCreatorById(match.id);
        deleted.push({
          id: result.id,
          username: result.username,
          email: result.email,
        });
      } catch (error) {
        failed.push({
          id: match.id,
          username: match.username,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const waitlistDeleted = await deleteE2eWaitlistEntries();

    return NextResponse.json({
      success: true,
      deletedCount: deleted.length,
      failedCount: failed.length,
      waitlistDeleted,
      deleted,
      failed,
    });
  } catch (error) {
    console.error('Admin delete e2e creators error:', error);
    return NextResponse.json({ error: 'Failed to delete e2e creators' }, { status: 500 });
  }
}
