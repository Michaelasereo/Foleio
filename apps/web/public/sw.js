// Foleio Platform Service Worker
// Provides offline support and caching for critical resources

// Bump on SW behavior changes so activate clears stale caches.
const CACHE_NAME = 'foleio-v1.0.1';
const STATIC_CACHE = 'foleio-static-v1.0.1';
const DYNAMIC_CACHE = 'foleio-dynamic-v1.0.1';

// Resources to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  // Cache critical CSS and JS (will be populated by build)
  // Add your main app chunks here during build
];

// API endpoints to cache for offline reading
const API_CACHE_PATTERNS = [
  /\/api\/creator\/me$/,  // Creator profile
  /\/api\/content/,       // Content listings (GET only)
  /\/api\/collections/,   // Collection listings (GET only)
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');

  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      try {
        await cache.addAll(STATIC_ASSETS);
        console.log('Static assets cached successfully');
      } catch (error) {
        console.warn('Failed to cache some static assets:', error);
        // Continue with partial cache
      }

      // Force activation of new service worker
      self.skipWaiting();
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');

  event.waitUntil(
    (async () => {
      // Clear all caches to avoid stale chunk references after deploys.
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));

      // Take control of all clients
      await self.clients.claim();
    })()
  );
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept full page navigations. Let the browser/Next handle these
  // so auth redirects don't get replaced with a false offline page.
  if (request.mode === 'navigate') {
    return;
  }

  // Only intercept same-origin GETs. Cross-origin gallery/CDN URLs (R2 `.jpg`,
  // etc.) must bypass the SW — no-cors image responses are opaque (`ok: false`)
  // and the old handler returned a 503 Offline body, which showed broken images
  // until a reload raced past the worker.
  if (request.method === 'GET' && url.origin === self.location.origin) {
    if (isStaticAsset(url)) {
      event.respondWith(handleStaticRequest(request));
    } else if (isApiRequest(url)) {
      event.respondWith(handleApiRequest(request));
    }
  }
});

// Check if request is for a static asset (same-origin only; see fetch handler)
function isStaticAsset(url) {
  return url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

// Check if request is for an API endpoint
function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

// Check if request is for a page
function isPageRequest(url) {
  return !url.pathname.includes('.');
}

// Handle static asset requests
async function handleStaticRequest(request) {
  try {
    // Try network first, fall back to cache
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Update cache with fresh version
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('Network failed for static asset, trying cache');
  }

  // Fall back to cache
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // Return offline fallback
  return new Response('Offline - Asset not available', {
    status: 503,
    statusText: 'Service Unavailable',
  });
}

// Handle API requests
async function handleApiRequest(request) {
  const url = new URL(request.url);

  // Only cache GET requests that match our patterns
  if (request.method === 'GET' && API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    try {
      const networkResponse = await fetch(request);

      if (networkResponse.ok) {
        // Cache successful responses
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, networkResponse.clone());
        return networkResponse;
      }
    } catch (error) {
      console.log('Network failed for API request, trying cache');
    }

    // Try cache for offline access
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Add offline indicator header
      const offlineResponse = new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: {
          ...Object.fromEntries(cachedResponse.headers),
          'X-Offline': 'true',
        },
      });
      return offlineResponse;
    }
  } else {
    // For non-cacheable API requests, try network only
    try {
      return await fetch(request);
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Network unavailable',
        offline: true,
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({
    error: 'API unavailable offline',
    offline: true,
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(syncOfflineActions());
  }
});

// Sync offline actions when connection is restored
async function syncOfflineActions() {
  try {
    // Process any queued offline actions
    // This would integrate with your offline queue system

    console.log('Offline actions synced successfully');
  } catch (error) {
    console.error('Failed to sync offline actions:', error);
  }
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();

    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: data.url,
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.openWindow(event.notification.data || '/')
  );
});
