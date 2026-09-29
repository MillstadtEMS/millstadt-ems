# Public form protection

Applications and public request forms are protected operational features. Unrelated design/content work must not change their submission, security, validation, persistence, signatures, or recovery behavior. Intentional repairs require explicit scope, passing behavior tests, and a reviewed fingerprint update.

## September 29 repair

The live failure was reproduced without storing a submission: preparing a second form rotated cookies and caused the first form to return HTTP 403. Retrying the checkbox did not refresh its CSRF token. Tokens also expired after one hour, and failed initialization could leave a form unable to recover without a reload.

- Valid security cookies are reused across tabs and remounts.
- Contact and employment clients refresh both tokens immediately before submitting, preserving the user's explicit checkbox confirmation and entered data.
- A single retry is allowed only for the explicit session error returned before persistence. Network failures, unexpected responses and server failures never trigger automatic duplicate submissions.
- Requests have timeouts; success requires an explicit server success response. Failed requests retain the printable/downloadable copy.
- Durable encrypted storage remains the acceptance boundary. Notification work runs after the receipt so a delayed provider cannot turn a saved application into an apparent failed submission.

## Release gates

1. `npm run test:public-forms`: behavioral tests for every public form type, token reuse, expired session recovery, missing confirmation, network failures, strict receipts, storage failures and notification failures. All persistence and notification adapters are isolated; no production records or emails are created.
2. `npm run protect:public-forms`: contract checks, deliberate regression mutations, and SHA-256 fingerprints in `scripts/public-form-protected-files.json`, using the same fingerprint approach as the protected ticker.
3. The production build runs the guards directly from `next.config.ts` as well as the normal prebuild hook, including when `next build` is called directly.
4. GitHub runs the complete tests and guards on every main push and pull request, including dependency or shared-code changes.

Do not regenerate fingerprints merely to make a build pass. For an authorized repair, review the diff, run behavior tests, update only the reviewed file hashes, then run guards, typecheck, lint, and the production build. Preserve the existing ticker protections.

## Live verification

`node scripts/check-public-forms-live.mjs https://www.millstadtems.org` checks both submission routes and token reuse. Every POST deliberately omits required fields and must return validation errors. It cannot create a record, trigger rate limiting, or send email. Run after a deployment. Real persistence/mail delivery still depends on the production database and providers; fingerprint checks cannot guarantee third-party uptime.
