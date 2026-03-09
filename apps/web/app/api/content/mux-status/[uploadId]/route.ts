import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  try {
    const { uploadId } = await params;
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const muxToken = Buffer.from(
      `${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`
    ).toString('base64');

    const uploadResponse = await fetch(`https://api.mux.com/video/v1/uploads/${uploadId}`, {
      headers: {
        Authorization: `Basic ${muxToken}`,
      },
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      return NextResponse.json(
        { error: 'Failed to retrieve upload status', details: errorText },
        { status: 500 }
      );
    }

    const uploadData = await uploadResponse.json();
    const uploadStatus = uploadData?.data?.status as string | undefined;
    const assetId = uploadData?.data?.asset_id as string | undefined;

    if (uploadStatus === 'errored' || uploadStatus === 'cancelled') {
      return NextResponse.json({
        status: 'errored',
        error:
          uploadData?.data?.error?.message ||
          uploadData?.error?.message ||
          'Video upload failed before processing',
      });
    }

    if (!assetId) {
      return NextResponse.json({
        status: uploadStatus || 'waiting',
        error: uploadData?.data?.error?.message || null,
      });
    }

    const assetResponse = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
      headers: {
        Authorization: `Basic ${muxToken}`,
      },
    });

    if (!assetResponse.ok) {
      const errorText = await assetResponse.text();
      return NextResponse.json(
        { error: 'Failed to retrieve asset status', details: errorText },
        { status: 500 }
      );
    }

    const assetData = await assetResponse.json();
    if (assetData?.data?.status === 'errored') {
      return NextResponse.json({
        status: 'errored',
        assetId,
        error:
          assetData?.data?.errors?.messages?.[0] ||
          assetData?.data?.errors?.messages?.join(', ') ||
          'Video processing failed on Mux',
      });
    }

    const playbackId = assetData?.data?.playback_ids?.[0]?.id as string | undefined;
    const playbackUrl = playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null;

    return NextResponse.json({
      status: assetData?.data?.status ?? 'waiting',
      assetId,
      playbackId: playbackId ?? null,
      playbackUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to check Mux status', details: error?.message },
      { status: 500 }
    );
  }
}
