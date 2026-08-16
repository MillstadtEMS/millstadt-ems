# Financial Information Hub GO LIVE Checklist

This is a release gate, not a statement of production readiness. Checked items were verified in the local pre-launch build on 2026-08-16. Unchecked items block operational release.

## Authorization

- [ ] Owner has supplied the exact command `GO LIVE`.
- [ ] Intended production branch, reviewed commit, deployment target, and release operator are recorded.
- [ ] `BLOCKERS.md` has no unresolved launch-blocking item.
- [ ] Exact production recipient group, sender identity, attachment rules, and approval roles have owner signoff without entering addresses in source control.

## Application and security

- [x] Public production behavior fails closed to the approved Coming Soon experience in a local production smoke test.
- [x] Financial production APIs fail closed while disabled.
- [x] Restricted access, approval, stale-action, expiration/revocation, signed-PDF, idempotency, CSRF, upload-signature, privacy-shield, delivery-matrix, test-sink, and rate-limit integration checks pass locally.
- [x] Dependency audit reports zero known vulnerabilities.
- [x] Standard credential-pattern scans report no matching tracked source or Git patch-history secrets.
- [ ] Durable transactional database, migrations, encrypted private storage, backup, and tested restore are approved.
- [ ] Authenticated requester ownership, named least-privilege administrators, MFA, session expiry/rotation, and reauthentication are verified.
- [ ] Durable outbox, provider IDs/states, bounded retry, deduplication, bounce/failure handling, and manual retry are verified.
- [ ] Approved malware scanning/quarantine and time-limited private upload access are verified.
- [ ] Persistent distributed rate limiting, WAF/bot controls, audit sink, redaction, monitoring, alerting, and incident ownership are verified.
- [ ] TLS/domain/CDN cache/source-map/preview-protection/storage-permission evidence is recorded.

## Quality and accessibility

- [x] Financial integration suite, type check, scoped lint, production build, PDF inspection, and Chromium phone/tablet/desktop checks pass.
- [ ] Full repository lint passes without disabling rules.
- [ ] Current Safari/WebKit and Firefox flows pass.
- [ ] Automated accessibility scan, screen-reader session, zoom/text-resize, landscape, slow/offline, back/forward, refresh, and expired-session runs pass.
- [ ] Authorized DAST/SAST and protected-staging end-to-end tests pass.
- [ ] Production database transaction, provider timeout/bounce/webhook, backup restore, and malware-scanner tests pass.

## Release sequence

- [ ] Pull the latest approved commit and rerun every required check.
- [ ] Verify every required production environment variable by name without printing its value.
- [ ] Verify the exact delivery matrix and approved disclosure/document versions.
- [ ] Generate and inspect signed PDFs using fictional data.
- [ ] Run one authorized synthetic smoke test through designated production test isolation.
- [ ] Confirm synthetic data is absent from normal production queues.
- [ ] Enable operational routes through the approved server-controlled feature release.
- [ ] Verify route, authorization, persistence, storage, and audit health before enabling delivery.
- [ ] Enable real delivery and verify one authorized complete workflow without exposing private data.
- [ ] Record commit, deployment ID, UTC time, configuration version, test evidence, and approver.
- [ ] Confirm the reviewed rollback procedure and responsible rollback operator.
