/* Millstadt EMS application worker.
 * This worker intentionally has no fetch handler and creates no caches.
 * Confidential requests, admin pages, authenticated responses, documents,
 * signed PDFs, and form submissions are therefore never stored for offline use.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
