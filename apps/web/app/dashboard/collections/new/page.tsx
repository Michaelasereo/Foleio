import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@foleio/database';
import { redirect } from 'next/navigation';
import { CreateCollectionForm } from '@/components/collections/CreateCollectionForm';

export default async function NewCollectionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get creator's plans for access control
  const creatorPlans = await prisma.creatorPlan.findMany({
    where: {
      creator: { userId: user.id },
      isActive: true
    },
    orderBy: { price: 'asc' }
  });

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Create New Collection
        </h1>
        <p className="text-gray-600">
          Organize your tutorials into structured courses that fans can purchase
        </p>
      </div>

      <Suspense fallback={<CreateCollectionLoading />}>
        <CreateCollectionForm creatorPlans={creatorPlans} />
      </Suspense>
    </div>
  );
}

function CreateCollectionLoading() {
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
