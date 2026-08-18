# Millstadt EMS Read-Only Site Monitor

## What it does

- Checks the public homepage, Kids Club page, and Lounge login page once each night.
- Reviews aggregate security counts without sending IP addresses, user agents, CAD data, personnel data, or private records.
- Optionally reviews consented aggregate public-site analytics once a week.
- Keeps a short history of sanitized reports so it can identify recurring patterns.
- Stores reports for authorized administrators at /admin/ai-monitor.

## What it cannot do

- It cannot edit code, create commits, open pull requests, deploy, delete data, or change production.
- It cannot read CAD content, employee records, Board documents, financial records, or raw visitor records.
- A human must reproduce and verify a finding before changing code.

## Cost controls

- The only accepted model is gpt-5.6-luna.
- The application stops before a new call when the configured monthly cutoff would be crossed.
- Set the application cutoff to $18 and the OpenAI project hard limit to $20.
- Every report records token use and estimated cost.

## Required private environment variables

Configure these as sensitive server-side variables in Vercel. Never use a NEXT_PUBLIC_ name.

~~~text
OPENAI_API_KEY=
AI_MONITOR_ENABLED=false
AI_MONITOR_WEEKLY_ANALYTICS_ENABLED=false
AI_MONITOR_MODEL=gpt-5.6-luna
AI_MONITOR_MONTHLY_BUDGET_USD=18
AI_MONITOR_MAX_OUTPUT_TOKENS=900
AI_MONITOR_REPORT_RETENTION_DAYS=35
AI_MONITOR_SITE_URL=https://www.millstadtems.org
CRON_SECRET=
DATABASE_URL=
~~~

Start with both monitor switches set to false. After preview verification, enable nightly monitoring first. Enable weekly analytics only after the existing analytics privacy gates are approved and active.

## Schedule

The read-only GitHub Actions workflow invokes the protected Vercel endpoint twice around the daylight-saving boundary. The route runs only during the 23:00 Chicago hour and uses a unique local-date key, so only one nightly report can be created. On Sunday night the same route may also create the weekly report. Configure the existing Vercel CRON_SECRET value as the GitHub Actions secret AI_MONITOR_CRON_SECRET.

## Rollback

The pre-monitor local restore point is commit 528c8dc28f0ad73d63660bc3e649e1cf7e99da0d on branch codex/pre-ai-monitor-snapshot-20260818.
