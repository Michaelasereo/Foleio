import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { MAX_UPLOAD_SIZE_BYTES } from '@/lib/utils/constants';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
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

    const headerOrigin = request.headers.get('origin');
    const forwardedProto = request.headers.get('x-forwarded-proto');
    const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const inferredOrigin =
      headerOrigin ||
      (forwardedHost ? `${forwardedProto || 'https'}://${forwardedHost}` : null) ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://foleio.com';

    const response = await fetch('https://api.mux.com/video/v1/uploads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${muxToken}`,
      },
      body: JSON.stringify({
        cors_origin: inferredOrigin,
        max_size: MAX_UPLOAD_SIZE_BYTES,
        new_asset_settings: {
          playback_policy: ['public'],
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || 'Failed to create upload URL', details: data },
        { status: response.status }
      );
    }

    return NextResponse.json({
      uploadUrl: data?.data?.url,
      uploadId: data?.data?.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create upload URL', details: error?.message },
      { status: 500 }
    );
  }
}
