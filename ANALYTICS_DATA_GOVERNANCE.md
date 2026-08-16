# Website Analytics Data Governance

Status: production optional analytics are fail-closed until every required protected setting and review gate is complete. This document describes the implementation; it does not claim legal compliance.

## Separation

- Optional aggregate events use `site_analytics_events`.
- Random first-party recurring-browser estimates use `site_analytics_browser_estimates` and server-side HMAC values. The browser cookie contains no direct identity and is never joined to request, report, signature, Form 990, release, or document-access records.
- Consent choices use `site_privacy_consents`.
- Raw IP addresses exist only as AES-GCM ciphertext in `site_security_events`. Ordinary analytics reports never return them.
- Voluntary community-area selections use `site_analytics_surveys` without an analytics, browser, session, request, or identity key.
- Supervisor actions, exports, and security preservation holds use separate protected tables.
- Identified document requests and accuracy reports remain in their existing workflow stores and are not copied into analytics events.

## Automatic deletion

Vercel invokes `/api/cron/analytics-retention` daily with `CRON_SECRET`. The job deletes primary database rows after each configured category retention period and expires consent records, recurring-browser estimates, and protected export links. The event intake also runs the same cleanup opportunistically at a low rate so development and interrupted schedules do not leave cleanup entirely dormant.

An active, unexpired, Supervisor-created security-incident preservation hold prevents deletion only for protected security events in its recorded date range. Creating and releasing a hold requires a specific reason and produces an administrator audit entry. Holds expire after `ANALYTICS_RETENTION_INCIDENT_HOLD_DAYS`.

The application does not call data deleted when it may remain in infrastructure logs, provider backups, downloaded exports, or administrator-managed copies. Those systems require separately approved controls and verified expiry. A one-time analytics export URL expires after ten minutes, but the application cannot delete a file after a Supervisor downloads it.

## Access

`/admin/analytics` and every analytics read/export/hold API require an active named lounge account that is both an administrator and explicitly listed in `ANALYTICS_SUPERVISOR_EMPLOYEE_IDS`. Client-side navigation visibility is not an authorization control.

Raw security details additionally require a written security, abuse-prevention, troubleshooting, incident, or legal/regulatory reason. Review and export actions are audited. Public routes do not expose analytics summaries.

## Deliberately disabled collection

- No browser fingerprinting, canvas/font fingerprinting, hardware identifier, advertising identifier, biometric information, or cross-site identifier is collected.
- Precise browser location and background location are not implemented.
- Age is not inferred. The optional age-range survey is disabled because child-directed separation has not been established.
- No advertising network or external analytics SDK is present.
- Health/EMS information, names, signatures, narratives, uploaded files, private messages, document contents, and release/request identifiers are excluded from analytics payloads.

## Separate financial records

The configured restricted-document audit and request-PDF retention values are displayed for policy review, but the current financial workflow is an in-memory, synthetic development system. The analytics cleanup job does not falsely report deletion of those records. Durable production financial storage, deletion, backup, and legal-hold behavior remain launch blockers.
