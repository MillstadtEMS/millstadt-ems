# Security Operations Runbook

## Release Gate

1. Deploy to protected preview/staging first. Never test with real patient or employee medical data.
2. Run `npm audit`, `npm run test:security`, `npm run test:financials`, `npx tsc --noEmit`, scoped/full lint, and `npm run build`.
3. Verify root, form, Lounge login, Board login, administrator redirects, private-file denial, ticker, CAD, weather, and mobile layouts.
4. Confirm required environment variables exist without printing values. Production session, encryption, rate-limit, audit, cron, provider, and sync secrets must be independent random values stored only in the hosting secret store.
5. Record commit, deployment ID, configuration version, operator, approver, test evidence, rollback target, and UTC release time.

## Access and Secrets

- Use named accounts only. Review active Lounge, administrator, Board, inventory, and truck-check access monthly and after every staffing change.
- Disable a departed user immediately, revoke trusted devices/passkeys, rotate affected secrets, and verify old sessions fail.
- Rotate high-value secrets on a documented schedule and immediately after suspected exposure. Test rotation in staging first.
- Never place production values in source, issue trackers, email, screenshots, or `NEXT_PUBLIC_*` variables.
- Require MFA for every privileged account. Board MFA and shared inventory/truck credential retirement remain release blockers.

## Logging and Alerts

- Export authentication, rate-limit, admin mutation, financial approval, incident access, and private-file audit events to an append-only centralized sink.
- Alert on repeated failures, disabled-account attempts, off-hours privileged access, unusual download/export volume, audit-write failure, provider webhook failure, and configuration changes.
- Restrict log access; redact request bodies, cookies, tokens, signatures, medical details, and full identifiers.
- Define retention with privacy/legal leadership, apply legal holds where required, and test that ordinary users cannot alter audit history.

## Data and Backups

- Encrypt database and object storage at rest; require TLS in transit; restrict service credentials to least privilege.
- Run encrypted offsite backups on an approved schedule. Document recovery point and recovery time objectives.
- Perform and record a restore test at least quarterly and after storage/schema changes.
- Follow `SECURITY_DATA_MIGRATION.md` for legacy plaintext/public objects. Do not delete source objects until counts, hashes, authorization, and restore evidence reconcile.

## Uploads and Network Controls

- Keep private objects nonpublic and serve them only through authorization-aware routes with `no-store` and audit logging.
- Add malware quarantine/scanning before allowing production uploads to reach reviewers. File extension or MIME alone is not a malware verdict.
- Configure managed WAF/rate rules for login, public forms, uploads, webhooks, and unusual request volume; test emergency blocking and rollback.
- Protect preview deployments, disable production source maps unless specifically approved, and monitor certificate/domain changes.

## Cadence

- Weekly: review dependency updates and security alerts.
- Monthly: access review, failed-login trends, storage permissions, secret inventory, and alert delivery test.
- Quarterly: restore test, privileged-role review, private-object sample audit, and incident tabletop.
- Annually: formal risk analysis, penetration test, vendor/BAA review, workforce training, and incident plan approval.
