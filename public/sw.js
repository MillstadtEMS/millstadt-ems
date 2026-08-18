/* Millstadt EMS public-site service worker.
 * Only public informational pages and public static assets are cached.
 * APIs, employee systems, inventory, board, admin, and financial routes are
 * always network-only and never written to an offline cache.
 */

const CACHE_PREFIX = "millstadt-public-";
const workerUrl = new URL(self.location.href);
const revision = (workerUrl.searchParams.get("revision") || "production")
  .replace(/[^a-zA-Z0-9._-]/g, "")
  .slice(0, 64) || "production";
const PUBLIC_CACHE = `${CACHE_PREFIX}pages-${revision}`;
const ASSET_CACHE = `${CACHE_PREFIX}assets-${revision}`;
const IS_LOOPBACK = ["localhost", "127.0.0.1", "::1"].includes(workerUrl.hostname) || workerUrl.hostname.endsWith(".localhost");
const PUBLIC_ROUTES = new Set([
  "/",
  "/offline",
  "/about",
  "/leadership",
  "/fleet",
  "/medical-control",
  "/statistics",
  "/careers",
  "/community-education",
  "/ecg-challenge",
  "/kids-club",
  "/kids-club/activities",
  "/kids-club/games",
  "/kids-club/printables",
  "/kids-club/printables/911-call-guide",
  "/testimonials",
  "/privacy",
  "/links",
]);
const PROTECTED_PREFIXES = [
  "/api",
  "/admin",
  "/lounge",
  "/board",
  "/inventory",
  "/truckcheck",
  "/financials-information-hub",
];
const PUBLIC_ASSET_PREFIXES = [
  "/_next/static/",
  "/images/",
  "/kids-club/",
];

function isProtected(pathname) {
  return PROTECTED_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isPublicAsset(pathname) {
  return (
    PUBLIC_ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    pathname === "/manifest.json" ||
    pathname === "/favicon.ico"
  );
}

async function cachePublicPage(pathname) {
  const response = await fetch(new Request(pathname, { cache: "reload", credentials: "omit" }));
  if (!isCacheable(response, "text/html")) return;
  const cache = await caches.open(PUBLIC_CACHE);
  await cache.put(pathname, response);
}

function isCacheable(response, contentType) {
  const cacheControl = response.headers.get("cache-control") || "";
  return (
    response.ok &&
    response.headers.get("content-type")?.includes(contentType) &&
    !/(?:^|,)\s*(?:no-store|private)\b/i.test(cacheControl)
  );
}

self.addEventListener("install", (event) => {
  if (IS_LOOPBACK) {
    event.waitUntil(self.skipWaiting());
    return;
  }
  event.waitUntil((async () => {
    await Promise.allSettled(Array.from(PUBLIC_ROUTES, cachePublicPage));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    if (IS_LOOPBACK) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith(CACHE_PREFIX))
          .map((name) => caches.delete(name)),
      );
      await self.registration.unregister();
      return;
    }

    const active = new Set([PUBLIC_CACHE, ASSET_CACHE]);
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name.startsWith(CACHE_PREFIX) && !active.has(name))
        .map((name) => caches.delete(name)),
    );
    await self.clients.claim();
  })());
});

async function publicNavigation(request, pathname) {
  const cache = await caches.open(PUBLIC_CACHE);
  try {
    const response = await fetch(request);
    if (isCacheable(response, "text/html")) {
      await cache.put(pathname, response.clone());
    }
    return response;
  } catch {
    return (
      (await cache.match(pathname)) ||
      (await cache.match("/offline")) ||
      new Response(
        "<!doctype html><title>Offline</title><main><h1>No Internet Connection</h1><p>Please try again when a connection is available.</p></main>",
        { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 },
      )
    );
  }
}

async function publicAsset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request).then(async (response) => {
    const cacheControl = response.headers.get("cache-control") || "";
    if (response.ok && response.type === "basic" && !/(?:^|,)\s*(?:no-store|private)\b/i.test(cacheControl)) {
      await cache.put(request, response.clone());
    }
    return response;
  });
  if (cached) {
    void network.catch(() => undefined);
    return cached;
  }
  return network;
}

self.addEventListener("fetch", (event) => {
  if (IS_LOOPBACK) return;
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isProtected(url.pathname)) return;

  if (request.mode === "navigate") {
    if (url.search || !PUBLIC_ROUTES.has(url.pathname)) return;
    event.respondWith(publicNavigation(request, url.pathname));
    return;
  }

  if (isPublicAsset(url.pathname)) {
    event.respondWith(publicAsset(request));
  }
});
