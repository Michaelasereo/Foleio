import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { redirect } from 'next/navigation';
import { EditContentForm } from '@/components/content/EditContentForm';
import { serializeForClient } from '@/lib/utils';

interface EditContentPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditContentPage({ params }: EditContentPageProps) {
  const resolvedParams = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if content exists and belongs to user
  const content = await prisma.content.findUnique({
    where: { id: resolvedParams.id },
    include: {
      creator: {
        select: { userId: true, username: true }
      }
    }
  });

  if (!content) {
    redirect('/dashboard/content');
  }

  if (content.creator.userId !== user.id) {
    redirect('/dashboard/content');
  }

  // Get creator's plans for access control
  const creatorPlans = await prisma.creatorPlan.findMany({
    where: {
      creatorId: content.creatorId,
      isActive: true
    },
    orderBy: { price: 'asc' }
  });

  // Get available collections for tutorials
  const collections = await prisma.collection.findMany({
    where: {
      creatorId: content.creatorId,
      isPublished: true
    },
    select: {
      id: true,
      title: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Edit Content
        </h1>
        <p className="text-gray-600">
          Update your content details and settings
        </p>
      </div>

      <Suspense fallback={<EditContentLoading />}>
        <EditContentForm
          content={serializeForClient(content)}
          creatorPlans={serializeForClient(creatorPlans)}
          collections={serializeForClient(collections)}
        />
      </Suspense>
    </div>
  );
}

function EditContentLoading() {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    </div>
  );
}
