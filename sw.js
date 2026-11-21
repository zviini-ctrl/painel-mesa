/* Painel de Mesa — service worker */
var CACHE = "painel-mesa-v3";
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  // Network-first for the page itself, so updates show up immediately when online.
  if (req.mode === "navigate" || req.destination === "document") {
    e.respondWith(
      fetch(req).then(function (res) {
        try { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); } catch (_) {}
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) { return hit || caches.match("./index.html"); });
      })
    );
    return;
  }

  // Cache-first for everything else (icons, fonts, etc.)
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        try {
          var u = new URL(req.url);
          var cacheable = u.origin === location.origin ||
            u.host.indexOf("gstatic") > -1 || u.host.indexOf("googleapis") > -1;
          if (cacheable && res && res.status === 200) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copy); });
          }
        } catch (_) {}
        return res;
      }).catch(function () { return caches.match("./index.html"); });
    })
  );
});
