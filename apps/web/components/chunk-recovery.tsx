'use client';

import { useEffect } from 'react';

export function ChunkRecovery() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const message = String(event.message || '');
      if (
        message.includes('Loading chunk') ||
        message.includes('ChunkLoadError') ||
        message.includes('Failed to fetch') ||
        message.includes('Unexpected token')
      ) {
        const now = Date.now();
        const lastReload = sessionStorage.getItem('chunk-reload');
        if (!lastReload || now - Number.parseInt(lastReload, 10) > 10000) {
          sessionStorage.setItem('chunk-reload', String(now));
          window.location.reload();
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          if (!registration.scope.startsWith(window.location.origin)) {
            void registration.unregister();
          }
        }
      });
    }

    window.addEventListener('error', handleError);
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  return null;
}
