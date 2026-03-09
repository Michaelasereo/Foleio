import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const origin = `${url.protocol}//${url.host}`;

  if (code) {
    const supabase = await createRouteHandlerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const target = `${origin}/onboarding`;
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Redirecting...</title>
  </head>
  <body style="margin:0;background:#F5F0E8;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;">
    <img src="/foleio-logo.png" alt="Foleio" style="height:56px;width:auto;margin-bottom:20px;" />
    <div style="width:32px;height:32px;border:3px solid #F0EAE0;border-top:3px solid #F97316;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
    <p style="margin-top:16px;font-size:14px;color:#9E8E82;">Confirming your session...</p>
    <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    <script>
      setTimeout(function () {
        window.location.replace(${JSON.stringify(target)});
      }, 250);
    </script>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
