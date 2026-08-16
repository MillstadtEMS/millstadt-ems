# Financial Information Hub Deployment Runbook

Release posture as of 2026-08-16: pre-launch. The complete synthetic application is available only in development. A production runtime is hard-disabled and serves the approved Coming Soon page while every financial API returns 404.

## Preconditions

1. Use the approved branch and record its commit SHA.
2. Confirm deployment previews require authentication. Do not push a branch that can create an unprotected preview.
3. Review `BLOCKERS.md`, `FORM_DELIVERY_MATRIX.md`, and `GO_LIVE_CHECKLIST.md`.
4. Verify required environment variable names without displaying their values. Use the hosting provider's protected configuration, never a committed file.
5. Confirm the deployment target, domain, TLS state, backup state, database migration state, private-storage permissions, sender identity, and monitoring with the responsible owners.
6. Run the quality gates in `TEST_EVIDENCE.md`. Do not weaken a test or lint rule to obtain a pass.

## Local synthetic application

```bash
npm ci
npm run dev
```

Open `http://localhost:3000/financials-information-hub`. Development must use synthetic records. Financial delivery defaults off; an explicit test-delivery gate accepts only addresses under the configured test-sink domain. Do not use real requester information.

## Pre-launch production deployment

1. Set `MILLSTADT_INFORMATION_HUB_ENV=production` and leave every financial allow flag false.
2. Leave `MILLSTADT_INFORMATION_HUB_TEST_DELIVERY_ENABLED=false` and do not configure financial production recipients.
3. Build from the recorded commit with `npm ci` and `npm run build`.
4. Deploy through the existing hosting provider without changing the domain or framework.
5. Verify `/financials-information-hub` contains exactly the approved title and construction message.
6. Verify all `/api/financials/*` routes return 404 and protected financial administration is not operationally reachable.
7. Verify no test sink or real delivery was invoked. Record deployment ID, commit, UTC time, and operator.

## Controlled GO LIVE path

The exact command `GO LIVE` has not been received. Environment flags alone cannot activate this build in production: the production branch of `getFinancialsHubConfig` intentionally fails closed. After the owner gives that exact command, first resolve every launch blocker and implement/review the approved durable database, private storage, authenticated requester sessions, least-privilege administrator identity with MFA, durable outbox/provider states, retention, monitoring, and production feature controls.

Then perform every unchecked item in `GO_LIVE_CHECKLIST.md`. Enable operational routes with a server-controlled release first. Enable real delivery only after route, authorization, data, and audit health are verified with an authorized synthetic transaction. Never expose recipient configuration to the client or logs.

## Post-deployment verification

- Confirm security and cache headers on the page and APIs.
- Confirm the expected UI at phone, tablet, and desktop widths.
- Confirm unauthenticated administrative and restricted-document access fails.
- Confirm public Form 990 access remains ungated only after that public route is intentionally activated.
- Confirm a restricted request cannot view content before approval and loses access immediately after revocation/expiration.
- Confirm delivery records, provider events, monitoring, and audit IDs correspond to the exact approved version.
- Record results without requester data, signatures, tokens, recipient addresses, or provider payloads.

## Stop conditions

Stop the release and follow `ROLLBACK_PLAN.md` for an authorization bypass, unexpected operational production route, recipient mismatch, duplicate delivery, missing signature/version binding, public sensitive cache, missing audit event, database/storage inconsistency, failed malware verdict, exposed secret, or unresolved critical/high finding.
