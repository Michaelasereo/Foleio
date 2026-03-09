'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';

export function ServiceWorkerRegistration() {
  const [isOnline, setIsOnline] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          const scope = registration.scope || '';
          if (!scope.startsWith(window.location.origin)) {
            void registration.unregister();
          }
        }
      });

      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version available
                  toast({
                    title: 'Update Available',
                    description: 'A new version of the app is available. Refresh to update.',
                    action: (
                      <ToastAction altText="Refresh app" onClick={() => window.location.reload()}>
                        Refresh
                      </ToastAction>
                    ),
                  });
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }

    // Handle online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: 'Back Online',
        description: 'Your connection has been restored.',
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: 'Offline Mode',
        description: 'You can continue using cached content.',
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Show offline indicator
  if (!isOnline) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-md shadow-lg">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
            <span className="text-sm font-medium">Offline</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
