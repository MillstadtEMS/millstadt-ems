# Security Incident Response Outline

Leadership must assign named primary and backup contacts in a secure operational system; do not store private phone trees or credentials in this repository.

## Notification Order

1. On-call technical lead / incident commander.
2. Executive leadership and designated privacy/security officer.
3. Legal/privacy counsel when personal, employee, patient, financial, or regulated data may be involved.
4. Hosting, database, object-storage, identity, email/SMS, or other affected vendor incident teams.
5. Communications lead, insurer, law enforcement, regulators, and affected individuals only as directed by the incident commander and counsel.

## First Response

1. Open an incident record with UTC time, reporter, affected systems, observed indicators, and data categories. Assign severity and commander.
2. Preserve evidence: logs, audit events, deployment/configuration history, provider records, object metadata, and volatile details. Record collection hashes and chain of custody.
3. Contain without destroying evidence: revoke sessions/tokens, disable affected accounts, rotate exposed credentials, block malicious traffic, isolate deployments, and pause affected workflows.
4. Determine scope: earliest/latest activity, accounts, routes, records, objects, vendors, recipients, and whether confidentiality, integrity, or availability was affected.
5. Eradicate the cause, patch through reviewed staging, verify backups, restore carefully, monitor for recurrence, and document every action/decision.

## PHI or Sensitive Data

- Treat uncertain patient-identifiable or health-related data as PHI-adjacent until privacy/legal leadership decides otherwise.
- Do not place patient details in ordinary email, chat, tickets, or public status updates.
- Notify privacy/legal leadership immediately. They must determine applicable HIPAA, Illinois, contract, insurer, and other notification duties and deadlines.
- Contact affected vendors through approved channels and preserve their incident reports, contractual notices, and BAA-related evidence.
- Do not promise that no breach occurred until evidence review and legal/privacy assessment are complete.

## Closure

- Confirm recovery, monitoring, credential rotation, affected-user actions, vendor responses, and required notifications.
- Hold a blameless review; record root cause, timeline, impact, evidence, control failures, corrective owners, and due dates.
- Update the risk assessment, runbooks, tests, training, and architecture. Verify corrective actions rather than closing on intent alone.
