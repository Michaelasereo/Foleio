import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { JournalEditor } from '@/components/journal/JournalEditor';

export default async function NewJournalPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const creator = await prisma.creator.findUnique({
    where: { userId: session.user.id },
    select: { displayName: true, username: true, avatarUrl: true },
  });
  if (!creator) redirect('/settings');

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">New Journal Entry</h1>
      <JournalEditor creator={creator} />
    </div>
  );
}
