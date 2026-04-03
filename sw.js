/* ==========================================================================
   Kenetik Circuit — Service Worker (Section 11.1)
   Cache-first for static assets, network-first for API calls
   Local queue fallback for offline
   ========================================================================== */

var CACHE_NAME = 'kenetik-circuit-v1';
var STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/brain-score.css',
  '/js/engine.js',
  '/js/identity.js',
  '/js/gamification.js',
  '/js/supabase.js',
  '/js/loyaltylion.js',
  '/js/klaviyo.js',
  '/js/consumption.js',
  '/exercises/stroop.js',
  '/exercises/dsst.js',
  '/exercises/flanker.js',
  '/exercises/nback.js',
  '/exercises/task-switching.js'
];

// Install: cache static assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate: clean old caches
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

// Fetch: cache-first for static, network-first for API
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // Network-first for API calls (Supabase, LoyaltyLion, Klaviyo)
  if (url.pathname.startsWith('/rest/') || url.hostname.includes('supabase') ||
      url.hostname.includes('loyaltylion') || url.hostname.includes('klaviyo')) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return new Response(JSON.stringify({ offline: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request).then(function(response) {
        if (response.ok) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    }).catch(function() {
      // Offline fallback
      if (event.request.destination === 'document') {
        return caches.match('/index.html');
      }
    })
  );
});
