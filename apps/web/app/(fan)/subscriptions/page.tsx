import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PrismaClient } from '@foleio/database';
import { FanSubscriptions } from '@/components/fan/Subscriptions';

const prisma = new PrismaClient();

export default async function FanSubscriptionsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const subscriptions = await prisma.fanSubscription.findMany({
    where: { fanId: session.user.id },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      plan: {
        select: {
          name: true,
          price: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return <FanSubscriptions subscriptions={subscriptions} />;
}

