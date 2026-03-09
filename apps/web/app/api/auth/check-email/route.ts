import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ exists: false }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (error) {
      return NextResponse.json(
        { exists: false, error: 'Failed to check email' },
        { status: 500 }
      );
    }

    const exists = data.users.some((user) => user.email?.toLowerCase() === email);
    return NextResponse.json({ exists });
  } catch (error: any) {
    return NextResponse.json(
      { exists: false, error: error?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
