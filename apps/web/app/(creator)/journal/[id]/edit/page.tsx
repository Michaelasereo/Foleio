import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { JournalEditor } from '@/components/journal/JournalEditor';

export default async function EditJournalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const creator = await prisma.creator.findUnique({
    where: { userId: session.user.id },
    select: { id: true, displayName: true, username: true, avatarUrl: true },
  });
  if (!creator) redirect('/settings');

  const entry = await prisma.journalEntry.findFirst({
    where: { id, creatorId: creator.id },
  });
  if (!entry) redirect('/journal');

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Edit Journal Entry</h1>
      <JournalEditor creator={creator} initialEntry={entry} />
    </div>
  );
}
