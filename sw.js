/* ==========================================================================
   Kenetik Circuit — Service Worker (Section 11.1)
   Stale-while-revalidate for static assets (instant + fresh on next load)
   Network-first for API calls with local queue fallback
   ========================================================================== */

var CACHE_NAME = 'kenetik-circuit-v5';

// Install: skip waiting to activate immediately
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

// Activate: claim all clients and clean old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: stale-while-revalidate for static, network-first for API
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // Network-first for API calls (Supabase, LoyaltyLion, Klaviyo)
  if (url.hostname.includes('supabase') || url.hostname.includes('loyaltylion') ||
      url.hostname.includes('klaviyo') || url.pathname.startsWith('/rest/')) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return new Response(JSON.stringify({ offline: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Stale-while-revalidate for everything else
  // Serve cached version immediately, fetch fresh copy in background
  event.respondWith(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.match(event.request).then(function(cached) {
        var fetchPromise = fetch(event.request).then(function(response) {
          if (response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(function() {
          return cached; // offline fallback
        });

        // Return cached immediately if available, otherwise wait for network
        return cached || fetchPromise;
      });
    })
  );
});
