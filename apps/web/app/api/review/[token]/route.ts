import { NextResponse } from 'next/server';
import {
  getReviewRequestByToken,
  submitReviewByToken,
} from '@/lib/reviews/request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const ctx = await getReviewRequestByToken(String(token || '').trim());
    if (!ctx) {
      return NextResponse.json({ error: 'Invalid review link' }, { status: 404 });
    }
    return NextResponse.json(ctx);
  } catch (error) {
    console.error('[review/:token][GET] failed:', error);
    return NextResponse.json({ error: 'Failed to load review' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const result = await submitReviewByToken({
      token: String(token || '').trim(),
      rating: Number(body?.rating),
      quote: String(body?.quote || ''),
      location: body?.location != null ? String(body.location) : null,
    });
    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[review/:token][POST] failed:', error);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
