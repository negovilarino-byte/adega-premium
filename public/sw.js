const BASE = new URL("./", self.location).pathname;
const CACHE = "adega-premium-v1";
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([BASE, BASE + "manifest.webmanifest"]))));
self.addEventListener("fetch", event => {
  if (event.request.method === "GET" && new URL(event.request.url).origin === self.location.origin) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
  }
});
