"use client";

import { useEffect } from "react";
import { SITE_BUILD_REVISION } from "@/lib/site-version";

const MILLSTADT_PUBLIC_CACHE_PREFIX = "millstadt-public-";

function isLoopbackHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname.endsWith(".localhost");
}

function isMillstadtRegistration(registration: ServiceWorkerRegistration) {
  return [registration.active, registration.waiting, registration.installing].some((worker) => {
    if (!worker) return false;
    const script = new URL(worker.scriptURL);
    return script.origin === window.location.origin && script.pathname === "/sw.js";
  });
}

async function removeLocalMillstadtPwa() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter(isMillstadtRegistration)
      .map((registration) => registration.unregister()),
  );

  if (!("caches" in window)) return;
  const cacheNames = await window.caches.keys();
  await Promise.all(
    cacheNames
      .filter((name) => name.startsWith(MILLSTADT_PUBLIC_CACHE_PREFIX))
      .map((name) => window.caches.delete(name)),
  );
}

export default function PwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production" || isLoopbackHost(window.location.hostname)) {
      void removeLocalMillstadtPwa().catch(() => {
        // Cleanup is best-effort and must never interrupt local development.
      });
      return;
    }

    const revision = encodeURIComponent(SITE_BUILD_REVISION || "production");
    void navigator.serviceWorker.register(`/sw.js?revision=${revision}`, {
      scope: "/",
      updateViaCache: "none",
    }).catch(() => {
      // Installation remains optional; the website continues to work normally.
    });
  }, []);

  return null;
}
