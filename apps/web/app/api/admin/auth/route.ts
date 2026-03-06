export async function POST(request: Request) {
  const { password } = (await request.json()) as { password?: string };
  if (!password || password !== process.env.ADMIN_SECRET) {
    return Response.json({ error: 'Wrong password' }, { status: 401 });
  }

  const res = Response.json({ success: true });
  const maxAge = 7 * 24 * 60 * 60;
  res.headers.set(
    'Set-Cookie',
    `admin_session=${process.env.ADMIN_SECRET}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Strict`
  );
  return res;
}
