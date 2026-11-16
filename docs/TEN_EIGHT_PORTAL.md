# Ten-Eight website portal — prepared, not published

Two unlisted paths serve an independently gated browser edition of Ten-Eight:

- `/ten-eight`: password entry, then explicit fictional-role selection.
- `/ten-eight/dispatch`: the same gate; after choosing a role, opens **Create alert** for roles authorized by the upstream demo. It never silently grants a dispatcher role.

No navigation, sitemap, public form, site authentication, cron job or public service worker has changed. A narrowly scoped `proxy.ts` branch applies the portal's stricter headers only to the exact `/ten-eight` path or its slash-prefixed children; existing route headers remain unchanged. The portal is a Next route handler, not an iframe. Its own app files and API live under `/ten-eight`; none uses the website's root `/api` namespace.

## What the password protects

The password gates this website entrance and all its vendored assets/API routes. The underlying exercise remains the **shared public fictional workspace** at `https://ten-eight-training.onrender.com`. This is not a private operational tenant. Other demo visitors may see or change its fictional calls. Never enter real patients, staff, locations or emergency traffic. Live CAD, phone delivery, personal location, device enrollment and provider actions are not connected through this portal.

The cookie is `__Secure-ten_eight_portal`, host-only, `Path=/ten-eight`, `HttpOnly`, `Secure`, `SameSite=Strict`, with an exact eight-hour expiry. Password or session-secret rotation invalidates existing sessions. Sign-out removes the portal cookie and unloads the app; it leaves employee/Lounge cookies alone. Role tokens stay in the app's existing memory-only session and are signed for this portal session before proxy use. A portal logout is not a global upstream demo logout and is not a server-wide revocation list.

A URL prefix is not a separate browser origin. This edition inherits the website's origin security; use a separate origin and named production authentication before any real operational deployment. The shared password is not production per-person authentication or MFA.

## Configuration, supplied privately at publication

Both values must be server-side environment variables, never `NEXT_PUBLIC_*`:

| Name                              | Format                                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| `TEN_EIGHT_PORTAL_PASSWORD_HASH`  | `scrypt-v1$<16-byte base64url salt>$<32-byte base64url derived key>`; scrypt N=32768, r=8, p=1 |
| `TEN_EIGHT_PORTAL_SESSION_SECRET` | Independently generated random base64url value, 43–128 characters; helper uses 48 random bytes |

Missing or malformed configuration returns 503, including for static portal assets. No default password exists. `scripts/create-ten-eight-portal-config.mjs` reads the password **only from stdin**, requires at least 8 characters, and writes the hash plus a new random session secret to a **new mode-0600 file**. It rejects terminal echo/command-line password input, does not overwrite a file and never prints values. Supply its input from an approved private source; do not put passwords in shell history. Run with Node 24 or with the site's TypeScript loader. Copy the values into the deployment's private environment through the approved operator flow; the helper file is not source material to commit.

The sign-in route reuses the website's existing `checkRateLimit` facility with its own `ten-eight-portal-login` bucket: six attempts per IP per ten minutes, fifteen-minute block. It inherits the site's existing security-rate-limit signing key and database configuration. The existing limiter has a memory fallback if the database is unavailable; this is not a distributed guarantee during that fallback. Do not remove the site's existing rate-limit configuration. The two portal variables are additional to the website's current production environment.

## Contained connection

`/ten-eight/api/v1/...` has a fixed HTTPS destination. It does not accept an upstream URL or redirects. It allows only the explicitly listed public-demo actions and independently rejects location-sharing and critical-notification requests. API queries and unrecognized paths are denied. It forwards only Accept, Content-Type when needed, the public-demo bearer token, and the selected agency ID. Website cookies, the portal cookie, pilot credentials, provider secrets, forwarded headers and upstream Set-Cookie are never relayed.

Workspace configuration, login and snapshots must explicitly say `publicPreview:true` and `realm:'public-demo'`; otherwise the result is withheld. Only a successful public-demo login yields a session-bound proxy bearer envelope. Arbitrary existing private-workspace tokens cannot be inserted. Errors are JSON, redirects are not followed, request/response sizes are bounded, and the upstream request times out after 8.5 seconds. The portal does not queue failed requests; a timeout after sending can be uncertain, so the existing event-id retry/status workflow must be used.

All portal responses are private/no-store/noindex, including assets and denied requests. The portal CSP permits only its same-origin scripts/API and user-approved public OpenStreetMap tile images. Microphone, camera, geolocation, framing and workers are disabled. Existing public website headers are untouched. The built HTTP rehearsal confirmed that Next's existing proxy overwrites route CSP headers, so the approved exact-prefix branch in `proxy.ts` is necessary. Its single protected-file fingerprint is deliberately updated after reviewing the diff and passing existing public-form behavior tests; no other protected fingerprint changes.

## App packaging and updates

`scripts/vendor-ten-eight.mjs /absolute/path/to/ten-eight` copies an explicit asset allowlist, rebases known local app/API paths and makes the two portal-only adjustments: dispatch entry intent and expired-portal-session recovery. The generated `lib/ten-eight-portal/vendor-assets.ts` is bundled directly into the route, avoiding filesystem tracing changes to protected `next.config.ts`. `source-manifest.json` records original and packaged hashes and the source revision; hashes remain authoritative if the parent Ten-Eight source was still being finalized. Leaflet's license is included.

The portal has **no PWA or service worker registration**, no install manifest and no offline app shell. The account menu's **Website portal & sign out** entry explains this. The existing website worker uses an explicit public-page/static-prefix allowlist and does not cache this path; it is unchanged. Existing Ten-Eight private-note storage, when used for fictional notes, remains encrypted and bound to this website origin, realm, agency, role and call. It never uploads those notes.

Before publication, repackage from the final approved Ten-Eight source, rerun the focused tests, and ensure the fixed upstream has the corresponding public API version. Do not substitute a private tenant or pilot key to make a failed public connection work.

## Verification

Run using the site's installed dependencies:

```text
node --import tsx --test scripts/test-ten-eight-portal.ts
node node_modules/next/dist/bin/next build
node --import tsx scripts/check-ten-eight-portal-http.ts
```

The focused tests verify salted hashing, exact expiry, rotation, origin/rate/size checks, static/API gate, portal-bound bearer tokens, denied private actions, public realm enforcement, response-header stripping, prefix-contained assets, online-only packaging and execution of the actual packaged login's dispatch-route intent. The HTTP rehearsal starts an owned local production server with ephemeral generated test credentials, checks the real gate/headers/CSP/static routes and stops it. It does not call upstream or expose credentials.

Local worktree validation may use `next build --webpack` because dependencies are shared through a symlink outside the worktree; production retains its existing default Next build. Browser HTTPS cookie behavior, actual upstream role/alert flows, 390px/desktop rendering, installed browsers and actual deployment are separate publication checks owned by the parent operator. No deployment or credential change is performed by these scripts.

### Observed preparation evidence — 2026-11-16

| Check                                | Observed result                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Focused portal tests                 | 12/12 passed, including a synthetic ten-character password helper/sign-in test, decoded-slash and inherited-property routing regressions found by independent review                          |
| Built local Next HTTP rehearsal      | 24/24 checks passed; ephemeral test credentials, process stopped afterward                                                            |
| Production compilation/type checking | `next build --webpack` passed; separate `tsc --noEmit` passed                                                                         |
| Existing public-form behavior        | 36/36 passed using isolated persistence/notification fixtures                                                                         |
| Protected public-form guards         | 97 contract checks, 10 representative regression mutations and all 44 fingerprints passed                                             |
| Existing broader security checks     | 30 hardening checks and 19 AI-monitor schedule checks passed                                                                          |
| Lint                                 | Full website: 0 errors, 49 warnings; focused portal files: no warnings/errors                                                         |
| Private configuration helper         | Actual Node24 run passed: mode0600, no plaintext password in file/output, existing-file overwrite denied; temporary test file removed |
| Source packaging                     | 19 upstream assets plus one portal-specific script; per-file hashes matched current source after refresh                              |

The optional legacy `scripts/test-auth-p0-hardening.mjs` fails because it expects a `/board/change-password` literal that is absent in the existing `proxy.ts`. The exact same failure was reproduced in the clean original website checkout at `522cb25457fc87d56b293c722e365a707c910064`; no unrelated Board authentication was changed to satisfy it.

The initial HTTP rehearsal deliberately remained failing until the real integration defects were fixed: global proxy headers overriding route CSP, followed by Next's internal URL differing from the external HTTPS Host/protocol. The final request-origin logic uses the actual HTTP Host and validated forwarded protocol, matching the website's established policy, and never trusts a forwarded host. Lookalike portal prefixes retain the original website security headers.
