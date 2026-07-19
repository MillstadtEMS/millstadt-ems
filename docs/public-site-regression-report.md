# Public Site Regression Report

Date: July 18, 2026
Branch: `codex/board-portal-forensic-correction`

## Scope Boundary

The correction was scoped to the private Board Portal:

- `app/board/**`
- `app/api/board/**`
- `components/board/**`
- `lib/board/**`
- Board-specific scripts and docs
- `public/board/branding/**`

No public marketing/public website page source was intentionally edited.

## Current Smoke Results

Smoke target: existing local dev server at `http://127.0.0.1:3000`

| Route | Result |
| --- | --- |
| `/` | 200, 121187 bytes |
| `/about` | 200, 141515 bytes |
| `/contact` | 200, 85023 bytes |
| `/fleet` | 200, 73317 bytes |
| `/board/login` | 200, 19989 bytes |
| `/board/referendum` unauthenticated | Redirected/finalized at `/board/login`, 200 |
| `/board` unauthenticated | Redirected/finalized at `/board/login`, 200 |

## Build Evidence

`npm run build` completed successfully after the Board Portal corrections. The final route table still includes the public routes and the Board routes.

## Limitations

Before screenshots were not captured before edits, so this report cannot claim pixel-level before/after parity. It can only claim:

1. The public-site source files were not part of the intentional change set.
2. Representative public routes returned HTTP 200 on the local dev server.
3. The production build completed successfully.

Recommended before deployment: capture visual screenshots for `/`, `/about`, `/contact`, `/fleet`, and any high-traffic public pages in the deployed preview.
