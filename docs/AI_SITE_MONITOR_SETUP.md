# Millstadt EMS Read-Only Site Monitor

## What it does

- Checks the public homepage, Kids Club page, and Lounge login page once each night.
- Reviews aggregate security counts without sending IP addresses, user agents, CAD data, personnel data, or private records.
- Optionally reviews consented aggregate public-site analytics once a week.
- Keeps a short history of sanitized reports so it can identify recurring patterns.
- Stores reports for authorized administrators at /admin/ai-monitor.
- Optionally emails each completed report, including findings and recommended fixes, through the site's existing Gmail service. Email delivery requires explicit production configuration; the default is dashboard only.

## What it cannot do

- It cannot edit code, create commits, open pull requests, deploy, delete data, or change production.
- It cannot read CAD content, employee records, Board documents, financial records, or raw visitor records.
- A human must reproduce and verify a finding before changing code.
- It is not a vulnerability scanner: it does not scan dependencies, review repository changes, inspect security headers, or scan files for malware. Its security evidence is limited to selected event counts and three public-page availability checks.
- Events recorded in `security_audit_events` are not yet included. A failed lookup of the separate Lounge login log is currently reported as zero failed logins, so zero counts must not be interpreted as proof that no threats occurred.

## Cost controls

- The only accepted model is gpt-5.6-luna.
- The application stops before a new call when the configured monthly cutoff would be crossed.
- The application cutoff is capped at $10 per month. Set `AI_MONITOR_MONTHLY_BUDGET_USD=10` or a lower amount; setting a higher value does not raise that cap.
- Every report records token use and estimated cost.

## Required private environment variables

Configure these as sensitive server-side variables in Vercel. Never use a NEXT_PUBLIC_ name.

~~~text
OPENAI_API_KEY=
AI_MONITOR_ENABLED=false
AI_MONITOR_WEEKLY_ANALYTICS_ENABLED=false
AI_MONITOR_MODEL=gpt-5.6-luna
AI_MONITOR_MONTHLY_BUDGET_USD=10
AI_MONITOR_MAX_OUTPUT_TOKENS=900
AI_MONITOR_REPORT_RETENTION_DAYS=35
AI_MONITOR_SITE_URL=https://www.millstadtems.org
AI_MONITOR_EMAIL_ENABLED=false
AI_MONITOR_EMAIL_TO=
CRON_SECRET=
DATABASE_URL=
~~~

Start with both monitor switches set to false. After preview verification, enable nightly monitoring first. Enable weekly analytics only after the existing analytics privacy gates are approved and active.

## Schedule

The read-only GitHub Actions workflow has one daily trigger at 08:17 UTC (03:17 Chicago daylight time / 02:17 standard time). Actual starts may be delayed. The route accepts delayed invocations and uses a unique Chicago calendar-date key, so a successful report is not duplicated for that date. On a Chicago Sunday, the same route also requests the optional weekly analytics report. This weekly report concerns website usage and content, not a second security scan.

Configure the existing Vercel `CRON_SECRET` value as the GitHub Actions secret `AI_MONITOR_CRON_SECRET`. Daily failure, missing/invalid monitor results, or failure of a due weekly report makes the workflow fail. A weekly report skipped because it is not Sunday or because weekly analytics is explicitly disabled is expected. Logs include both statuses and the reason for a weekly skip.

## Reading reports

Sign in to the Employee Lounge, then open `/admin/ai-monitor`. Access requires an active administrator whose employee ID is listed in `ANALYTICS_SUPERVISOR_EMPLOYEE_IDS`; being an administrator alone is not enough. Each saved report includes a summary and recommended actions. Workflow success confirms report generation, not the absence of vulnerabilities, successful email delivery, or completion of recommended fixes.

## Email delivery

After the owner approves the recipient, set `AI_MONITOR_EMAIL_TO` to that one email address and `AI_MONITOR_EMAIL_ENABLED=true` in production, then deploy. The existing `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and `GMAIL_REFRESH_TOKEN` must be configured. Preview/development deployments and `DISABLE_OUTBOUND_EMAIL=true` block this delivery path.

Emails contain the saved sanitized report, its scope, suggested fixes, and a link to the protected dashboard. Security reports are daily; website usage summaries are Sunday only. Email is not a new security scanner and never applies recommendations automatically.

Completed reports are queued durably when the cron endpoint runs. A recorded successful send is not repeated on duplicate invocations. Failed sends remain pending and become retryable after five minutes; another endpoint invocation or the following daily run processes up to three pending deliveries. Reports are not regenerated to retry email. Email configuration, provider, storage, or pending-delivery failures make the scheduled workflow fail visibly. Logs include only delivery status/counts, never report contents, email addresses, or credentials.

Enabling delivery does not automatically email the entire historical archive. Re-running today's completed monitor queues today's report. Delivery uses an atomic 15-minute claim to avoid concurrent sends. Gmail does not provide an idempotency key in the existing sender: if a send succeeds but the process loses the response or cannot record success, a later retry may deliver a duplicate. Pending items expire with their parent report's retention period. Provider acceptance is not proof of inbox arrival; verify the first daily and Sunday emails in the recipient inbox after activation.

## Rollback

The pre-monitor local restore point is commit 528c8dc28f0ad73d63660bc3e649e1cf7e99da0d on branch codex/pre-ai-monitor-snapshot-20260818.
