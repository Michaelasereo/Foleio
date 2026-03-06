import { Suspense } from 'react';
import { FanSupportChat } from '@/components/ai/FanSupportChat';
import { CreatorsDiscovery } from '@/components/creators/CreatorsDiscovery';

export const metadata = {
  title: 'Discover Creators | Foleio',
  description: 'Foleio is the creative portfolio platform for Nigerian creators — monetize your content, offer services, and build your world.'
};

export default function CreatorsPage() {
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Discover Amazing Creators
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Find creators in makeup, fashion, fitness, cooking, and more.
              Subscribe to get exclusive content and support your favorite creators.
            </p>
          </div>

          <Suspense fallback={<CreatorsLoading />}>
            <CreatorsDiscovery />
          </Suspense>
        </div>
      </div>
      <FanSupportChat />
    </>
  );
}

function CreatorsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
          <div className="h-48 bg-gray-300"></div>
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
              <div>
                <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-16"></div>
              </div>
            </div>
            <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
