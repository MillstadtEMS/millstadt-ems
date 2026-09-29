<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Protected public applications and forms

Treat public applications, request forms and their submission/security clients as protected operational features, like the CAD ticker. Read `docs/PUBLIC_FORM_PROTECTION.md` before changing them. Do not edit or refresh their fingerprint manifest during unrelated work. Authorized repairs must pass `npm run test:public-forms` and `npm run protect:public-forms`, with intentional review of the protected-file diff before updating fingerprints.
