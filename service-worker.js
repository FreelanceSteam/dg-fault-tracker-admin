const CACHE_NAME = "dg-admin-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./dg-fault-tracker-icon-192.png",
  "./dg-fault-tracker-icon-512.png",
  "./dg-fault-tracker-icon-180.png"
];

self.addEventListener("install", function(event) {

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(APP_SHELL);
      })
  );

  self.skipWaiting();
});


self.addEventListener("activate", function(event) {

  event.waitUntil(

    caches.keys().then(function(keys) {

      return Promise.all(

        keys
          .filter(function(key) {
            return key !== CACHE_NAME;
          })
          .map(function(key) {
            return caches.delete(key);
          })

      );

    })

  );

  self.clients.claim();
});


self.addEventListener("fetch", function(event) {

  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // External API / Apps Script requests ko cache nahi karna
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(

    fetch(request)

      .then(function(response) {

        const copy = response.clone();

        caches.open(CACHE_NAME)
          .then(function(cache) {
            cache.put(request, copy);
          });

        return response;

      })

      .catch(function() {

        return caches.match(request);

      })

  );

});
