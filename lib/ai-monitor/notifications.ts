import type { GmailMessageInput, GmailSendResult } from "@/lib/reports/gmail-message";
import { AiMonitorReportSchema, type AiMonitorReport, type AiMonitorReportType } from "./schemas";

type EmailConfiguration =
  | { status: "disabled" }
  | { status: "failed"; reason: string }
  | { status: "ready"; recipient: string };

export function aiMonitorEmailConfiguration(env: Record<string, string | undefined> = process.env): EmailConfiguration {
  if (env.AI_MONITOR_ENABLED !== "true" || env.AI_MONITOR_EMAIL_ENABLED !== "true") {
    return { status: "disabled" };
  }
  if (env.VERCEL_ENV !== "production" || env.DISABLE_OUTBOUND_EMAIL === "true") {
    return { status: "failed", reason: "outbound_email_disabled" };
  }
  const recipient = (env.AI_MONITOR_EMAIL_TO ?? "").trim();
  if (recipient.length > 254 || !/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(recipient)) {
    return { status: "failed", reason: "email_recipient_not_configured" };
  }
  if (![env.GMAIL_CLIENT_ID, env.GMAIL_CLIENT_SECRET, env.GMAIL_REFRESH_TOKEN]
    .every((value) => value?.trim())) {
    return { status: "failed", reason: "email_credentials_not_configured" };
  }
  return { status: "ready", recipient };
}

export type AiMonitorEmailJob = {
  runId: string;
  claimToken: string;
  recipient: string;
  runKey: string;
  reportType: AiMonitorReportType;
  report: AiMonitorReport;
};

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

export function composeAiMonitorEmail(job: AiMonitorEmailJob): GmailMessageInput {
  const report = AiMonitorReportSchema.parse(job.report);
  const title = job.reportType === "nightly_security" ? "Daily security report" : "Weekly website summary";
  const date = job.runKey.split(":")[1];
  const verdict = report.verdict.replaceAll("_", " ");
  const scope = job.reportType === "nightly_security"
    ? "Coverage: selected security-event counts and three public-page health checks. This is not a complete vulnerability or malware scan."
    : "Coverage: aggregate website usage and content suggestions. This is not a weekly security scan.";
  const sections = [
    `${title} — ${date} (Chicago date)`,
    `Result: ${verdict}`,
    report.summary,
    ...report.findings.map((finding) => [
      `${finding.severity.toUpperCase()}: ${finding.title}`,
      ...finding.evidence.map((evidence) => `Evidence: ${evidence}`),
      `Suggested fix: ${finding.recommendation}`,
    ].join("\n")),
    ...report.observations.map((observation) => `Observation: ${observation}`),
    scope,
    "Recommendations require human review. The monitor has not made any fixes.",
    "Saved reports (Lounge sign-in required): https://www.millstadtems.org/admin/ai-monitor",
    `Report reference: ${job.runKey}`,
  ];
  return {
    fromName: "Millstadt EMS Site Monitor",
    to: [job.recipient],
    subject: `[EMS Site Monitor] ${title} — ${date} — ${verdict}`,
    text: sections.join("\n\n"),
    html: sections.map((section) => `<p>${escapeHtml(section).replaceAll("\n", "<br>")}</p>`).join("\n"),
  };
}

export type AiMonitorEmailDependencies = {
  enqueue: (runKeys: string[], recipient: string) => Promise<void>;
  claim: (recipient: string) => Promise<AiMonitorEmailJob | null>;
  sent: (job: AiMonitorEmailJob) => Promise<void>;
  failed: (job: AiMonitorEmailJob) => Promise<void>;
  pending: (recipient: string) => Promise<number>;
  send: (message: GmailMessageInput) => Promise<GmailSendResult>;
};

async function defaultDependencies(): Promise<AiMonitorEmailDependencies> {
  const [store, gmail] = await Promise.all([
    import("./notification-store"),
    import("@/lib/reports/gmail-message"),
  ]);
  return { ...store.aiMonitorEmailStore, send: gmail.sendGmailMessage };
}

export async function deliverAiMonitorReports(
  runKeys: string[],
  configuration = aiMonitorEmailConfiguration(),
  dependencies?: AiMonitorEmailDependencies,
) {
  if (configuration.status !== "ready") return configuration;
  let sent = 0;
  let failed = 0;
  try {
    const store = dependencies ?? await defaultDependencies();
    await store.enqueue(runKeys, configuration.recipient);
    // Drain a small durable backlog as well as today's reports. Re-running the
    // endpoint retries email without repeating or paying for report generation.
    for (let index = 0; index < 3; index += 1) {
      const job = await store.claim(configuration.recipient);
      if (!job) break;
      try {
        const result = await store.send(composeAiMonitorEmail(job));
        if (!result.sent) throw new Error("email_not_sent");
        await store.sent(job);
        sent += 1;
      } catch {
        await store.failed(job);
        failed += 1;
      }
    }
    const pending = await store.pending(configuration.recipient);
    return failed > 0 || pending > 0
      ? { status: "failed" as const, reason: failed ? "email_delivery_failed" : "email_delivery_pending", sent, pending }
      : { status: "completed" as const, sent };
  } catch {
    // Do not leak email addresses, provider responses, or credentials into cron logs.
    return { status: "failed" as const, reason: "email_delivery_unavailable", sent };
  }
}
