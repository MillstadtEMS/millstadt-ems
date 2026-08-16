# Financial Information Hub Rollback Plan

## Current pre-launch state

The current operational production feature is disabled in code. A pre-launch rollback is a deployment rollback to the last known approved commit, followed by verification that the Coming Soon page remains the only public financial experience and every financial API returns 404.

## Rollback triggers

- Unauthorized access, IDOR, role bypass, stale approval, or signature/version mismatch.
- Sensitive response publicly cached, indexed, logged, or stored at an unintended location.
- Wrong recipient, duplicate delivery, incomplete attachment, or provider-state inconsistency.
- Data loss/corruption, failed migration, storage-permission error, missing audit event, or restore failure.
- Exposed secret, malware-scanner bypass, critical/high vulnerability, or unexplained integrity alarm.
- Material availability/accessibility regression in the approved workflow.

## Operational rollback after a future GO LIVE

1. Disable new requests, viewer/session creation, document APIs, public filing APIs if affected, and all delivery through server-side controls. Client-only hiding is insufficient.
2. Pause durable delivery workers/provider credentials without deleting queued records. Record the cutoff UTC time and last known provider event ID.
3. Revoke active restricted viewer sessions and preserve append-only audit evidence.
4. Roll the hosting deployment back to the last approved pre-launch/Coming Soon commit.
5. If a migration is implicated, stop writes and follow the reviewed migration rollback or restore procedure. Never improvise a destructive database rollback.
6. Quarantine affected uploads/documents and rotate exposed credentials or signing keys through the responsible provider.
7. Reconcile persisted requests, approvals, outbox rows, provider events, and delivered messages by opaque IDs. Do not place private data in the incident log.
8. Notify the designated owner through the approved incident channel and record scope, impact, containment, and next decision.

## Validation after rollback

- Coming Soon is the only public financial page.
- Financial operational APIs return 404.
- Delivery workers cannot send and no retry is silently active.
- Restricted sessions are invalidated.
- Existing evidence and audit records remain readable by authorized staff.
- Monitoring shows no continued access, writes, or provider activity.
- The rollback commit/deployment ID, time, operator, and verification results are recorded.

## Recovery

Root cause, affected records, recipient impact, key rotation, data correction, and regression tests must be reviewed before redeployment. Re-entry follows the full `GO_LIVE_CHECKLIST.md`; rollback does not authorize bypassing a failed gate.

The infrastructure/data rollback has not been tested because the required production database, object store, outbox, provider integration, monitoring, and protected staging environment do not yet exist. That is a launch blocker, not a passed result.
