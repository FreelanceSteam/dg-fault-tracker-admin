
const CACHE_NAME = "dg-technician-v1";

self.addEventListener("install", function (event) {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function (event) {
  const request = event.request;
  const url = new URL(request.url);

  // Sirf technician wrapper ke same-origin GET requests
  // ko handle karein; Apps Script/API ko cache na karein.
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  event.respondWith(
    fetch(request).catch(function () {
      return caches.match(request);
    })
  );
});

