"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, ShieldCheck } from "lucide-react";
import styles from "./AnalyticsDashboard.module.css";

type Summary = {
  mode: "limited" | "optional";
  range: { from: string; to: string };
  overview: Record<string, number> & {
    pageViews: number;
    estimatedSessions: number;
    estimatedReturningSessions: number;
    estimatedFirstTimeBrowsers: number;
    estimatedReturningBrowsers: number;
    averageEstimatedEngagementSeconds: number;
    form990Views: number;
    form990Downloads: number;
    printSelections: number;
    accessibleAlternativeViews: number;
    accessibilityControlUses: number;
    readAloudUses: number;
    clientErrors: number;
    averagePageLoadMs: number;
  };
  topPages: Array<{ path: string; views: number }>;
  documentEvents: Array<{ eventName: string; documentKind: string; events: number }>;
  geography: Array<{ broadArea: string; events: number }>;
  returning: { aggregateVisitFrequency: number; averageReturnIntervalDays: number; methodology: string };
  communitySurvey: Array<{ area: string; responses: number }>;
  security: Record<string, number>;
  workflow: Record<string, number>;
};

type IdentifiedItem = {
  id: string;
  name: string;
  email: string;
  status: string;
  submittedAt: string;
  agreementFilename: string | null;
  flags: string[];
  documentTitle?: string;
  selectedDocuments?: string[];
  administratorActions: Array<{
    eventType: string;
    timestamp: string;
    administratorId: string;
    result: string;
  }>;
};

type DashboardData = {
  summary: Summary;
  identifiedWorkflows: { accessRequests: IdentifiedItem[]; accuracyReports: IdentifiedItem[] };
  preservationHolds: Array<{
    id: string;
    category: "security";
    supervisorId: string;
    reason: string;
    rangeFrom: string;
    rangeTo: string;
    createdAt: string;
    expiresAt: string;
  }>;
  configuration: {
    mode: "limited" | "optional";
    optionalAnalyticsEnabled: boolean;
    productionRuntime: boolean;
    missingConfiguration: string[];
    minimumGroupSize: number;
    preciseLocationEnabled: boolean;
    ageRangeSurveyEnabled: boolean;
    communitySurveyEnabled: boolean;
    retention: Record<string, number>;
    privacyContactConfigured: boolean;
    systemConfigured: boolean;
    serviceProviderReviewConfigured: boolean;
  };
};

type RawSecurityEvent = {
  id: string;
  occurredAt: string;
  eventType: string;
  route: string;
  method: string;
  responseStatus: number | null;
  ipAddress: string | null;
  userAgentCategory: string;
  reason: string;
};

const EXPORT_FIELDS = [
  ["overview", "Overview"],
  ["topPages", "Top pages"],
  ["documentActivity", "Document activity"],
  ["geography", "Suppressed geography"],
  ["returning", "Returning estimates"],
  ["securitySummary", "Security summary"],
  ["workflow", "Document workflow counts"],
] as const;

export default function AnalyticsDashboard() {
  const dates = useMemo(() => defaultDates(), []);
  const [from, setFrom] = useState(dates.from);
  const [to, setTo] = useState(dates.to);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rawOpen, setRawOpen] = useState(false);
  const [rawReason, setRawReason] = useState("");
  const [rawEvents, setRawEvents] = useState<RawSecurityEvent[]>([]);
  const [holdReason, setHoldReason] = useState("");
  const [releaseReason, setReleaseReason] = useState("");
  const [exportFields, setExportFields] = useState<string[]>(["overview", "documentActivity"]);
  const [exportConfirmed, setExportConfirmed] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/analytics/summary?from=${encodeURIComponent(startIso(from))}&to=${encodeURIComponent(endIso(to))}`, { cache: "no-store" });
      const next = (await response.json()) as DashboardData & { error?: string };
      if (!response.ok) throw new Error(next.error || "Analytics could not be loaded.");
      setData(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analytics could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { void load(); }, [load]);

  async function reviewRawSecurity() {
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/analytics/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rawReason, from: startIso(from), to: endIso(to) }),
      });
      const result = (await response.json()) as { events?: RawSecurityEvent[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Security events could not be loaded.");
      setRawEvents(result.events ?? []);
      setMessage("Raw security review was recorded in the administrator audit log.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Security events could not be loaded.");
    }
  }

  async function createExport() {
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/analytics/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: exportFields, from: startIso(from), to: endIso(to), confirmed: exportConfirmed }),
      });
      const result = (await response.json()) as { downloadUrl?: string; expiresAt?: string; error?: string };
      if (!response.ok || !result.downloadUrl) throw new Error(result.error || "Export could not be prepared.");
      setMessage(`Protected export prepared. The link expires at ${formatDate(result.expiresAt ?? "")}.`);
      window.location.assign(result.downloadUrl);
      setExportConfirmed(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Export could not be prepared.");
    }
  }

  async function updateHold(action: "create" | "release", holdId?: string) {
    setMessage("");
    setError("");
    const reason = action === "create" ? holdReason : releaseReason;
    try {
      const response = await fetch("/api/admin/analytics/holds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "create"
            ? { action, reason, from: startIso(from), to: endIso(to) }
            : { action, reason, holdId },
        ),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Preservation hold could not be updated.");
      setMessage(action === "create" ? "Audited security preservation hold created." : "Audited security preservation hold released.");
      if (action === "create") setHoldReason("");
      else setReleaseReason("");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Preservation hold could not be updated.");
    }
  }

  if (!data && loading) return <p className={styles.panelText}>Loading Supervisor analytics...</p>;
  if (!data) return <p className={styles.error} role="alert">{error || "Analytics could not be loaded."}</p>;
  const { summary, configuration, identifiedWorkflows } = data;

  const metrics = [
    ["Page views", summary.overview.pageViews],
    ["Estimated sessions", summary.overview.estimatedSessions],
    ["Estimated returning sessions", summary.overview.estimatedReturningSessions],
    ["Estimated first-time browsers", summary.overview.estimatedFirstTimeBrowsers],
    ["Estimated returning browsers", summary.overview.estimatedReturningBrowsers],
    ["Average engagement", `${summary.overview.averageEstimatedEngagementSeconds}s`],
    ["Average page load", `${summary.overview.averagePageLoadMs}ms`],
    ["Client errors", summary.overview.clientErrors],
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Supervisor · Website operations</p>
          <h1>Website analytics</h1>
          <p>Aggregate and pseudonymous website measurements, separated from identified request and report workflows.</p>
        </div>
        <div className={styles.filters} aria-label="Analytics date range">
          <label className={styles.field}>From<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></label>
          <label className={styles.field}>To<input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} /></label>
          <button className={styles.button} type="button" onClick={() => void load()} disabled={loading}><RefreshCw aria-hidden size={15} />{loading ? "Refreshing" : "Refresh"}</button>
        </div>
      </header>

      <div className={styles.mode}>
        <ShieldCheck aria-hidden size={20} />
        <div><strong>{configuration.mode === "limited" ? "Limited mode" : "Optional analytics enabled"}</strong><br />{configuration.mode === "limited" ? "Only essential operational and security records are available. Optional collection remains off until every production gate is complete." : "Optional collection passed the configured runtime, privacy, security, provider, retention, role, and legal-review gates."}</div>
      </div>

      <div className={styles.metrics}>
        {metrics.map(([label, value]) => <div className={styles.metric} key={String(label)}><span>{label}</span><strong>{value}</strong></div>)}
      </div>

      <div className={styles.grid}>
        <Panel title="Top pages">
          <SimpleTable headers={["Page", "Views"]} rows={summary.topPages.map((row) => [row.path, row.views])} empty="No aggregate page activity in this range." />
        </Panel>
        <Panel title="Returning-visitor estimates">
          <dl className={styles.definitionList}>
            <dt>Estimated returning browsers</dt><dd>{summary.overview.estimatedReturningBrowsers}</dd>
            <dt>Estimated returning sessions</dt><dd>{summary.overview.estimatedReturningSessions}</dd>
            <dt>Aggregate visit frequency</dt><dd>{summary.returning.aggregateVisitFrequency}</dd>
            <dt>Average return interval</dt><dd>{summary.returning.averageReturnIntervalDays} days</dd>
          </dl>
          <p className={styles.method}>{summary.returning.methodology}</p>
        </Panel>

        <Panel title="Document activity">
          <dl className={styles.definitionList}>
            <dt>Public Form 990 views</dt><dd>{summary.overview.form990Views}</dd>
            <dt>Public Form 990 downloads</dt><dd>{summary.overview.form990Downloads}</dd>
            <dt>Print-control selections</dt><dd>{summary.overview.printSelections}</dd>
            <dt>Accessible alternatives</dt><dd>{summary.overview.accessibleAlternativeViews}</dd>
            {Object.entries(summary.workflow).map(([key, value]) => <Fragment key={key}><dt>{humanize(key)}</dt><dd>{value}</dd></Fragment>)}
          </dl>
          <p className={styles.method}>Public Form 990 events are stored without recurring-browser or session identifiers. Release IDs and request IDs are not analytics identifiers.</p>
        </Panel>
        <Panel title="Accessibility and performance">
          <dl className={styles.definitionList}>
            <dt>Accessibility-control use</dt><dd>{summary.overview.accessibilityControlUses}</dd>
            <dt>Read-aloud use</dt><dd>{summary.overview.readAloudUses}</dd>
            <dt>Accessible alternatives</dt><dd>{summary.overview.accessibleAlternativeViews}</dd>
            <dt>Average page load</dt><dd>{summary.overview.averagePageLoadMs} ms</dd>
            <dt>Client errors</dt><dd>{summary.overview.clientErrors}</dd>
          </dl>
        </Panel>

        <Panel title="Geographic summary">
          <SimpleTable headers={["Broad area", "Events"]} rows={summary.geography.map((row) => [row.broadArea, row.events])} empty={`No area met the ${configuration.minimumGroupSize}-event reporting threshold.`} />
          <p className={styles.method}>Country, state or region, and coarse municipality values may be reported. Groups below {configuration.minimumGroupSize} events are suppressed. Exact coordinates and residential addresses are not collected.</p>
        </Panel>
        <Panel title="Voluntary community-area survey">
          <SimpleTable headers={["Broad area", "Responses"]} rows={summary.communitySurvey.map((row) => [humanize(row.area), row.responses])} empty={configuration.communitySurveyEnabled ? `No survey group met the ${configuration.minimumGroupSize}-response threshold.` : "The unlinked community-area survey is disabled."} />
        </Panel>

        <Panel title="Identified requests and reports" wide>
          <p className={styles.panelText}>These records come only from submitted document workflows. They are not joined to ordinary browsing, geography, or returning-visitor estimates. Full review and signed PDF records remain in the protected financial review queue.</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Workflow</th><th>Name and contact</th><th>Record</th><th>Status</th><th>Submitted</th><th>Administrator action</th><th>PDF record</th></tr></thead>
              <tbody>
                {[...identifiedWorkflows.accessRequests.map((item) => ({ ...item, kind: "Access request" })), ...identifiedWorkflows.accuracyReports.map((item) => ({ ...item, kind: "Accuracy report" }))].map((item) => (
                  <tr key={`${item.kind}-${item.id}`}><td>{item.kind}</td><td>{item.name}<br /><span className={styles.panelText}>{item.email}</span></td><td>{item.id}<br /><span className={styles.panelText}>{item.documentTitle || item.selectedDocuments?.join(", ") || "Not listed"}</span></td><td><span className={styles.status}>{item.status}</span>{item.flags.length ? <><br /><span className={styles.panelText}>{item.flags.length} review flag(s)</span></> : null}</td><td>{formatDate(item.submittedAt)}</td><td>{item.administratorActions.length ? <>{humanize(item.administratorActions.at(-1)?.eventType ?? "Action")}<br /><span className={styles.panelText}>{formatDate(item.administratorActions.at(-1)?.timestamp ?? "")} · {item.administratorActions.at(-1)?.administratorId}</span></> : "None recorded"}</td><td>{item.agreementFilename || "Not available"}</td></tr>
                ))}
                {!identifiedWorkflows.accessRequests.length && !identifiedWorkflows.accuracyReports.length ? <tr><td colSpan={7} className={styles.empty}>No identified workflow submissions in this range.</td></tr> : null}
              </tbody>
            </table>
          </div>
          <p className={styles.method}><Link className={styles.link} href="/admin/financials">Open the protected financial review queue</Link></p>
        </Panel>

        <Panel title="Security summary">
          <dl className={styles.definitionList}>{Object.entries(summary.security).map(([key, value]) => <Fragment key={key}><dt>{humanize(key)}</dt><dd>{value}</dd></Fragment>)}</dl>
          <button className={styles.button} type="button" style={{ marginTop: 15 }} onClick={() => setRawOpen((current) => !current)}>{rawOpen ? "Close raw review" : "Review protected security details"}</button>
          {rawOpen ? <div className={styles.rawForm}><label className={styles.field}>Required investigation reason<textarea value={rawReason} maxLength={240} onChange={(event) => setRawReason(event.target.value)} placeholder="Describe the actual security, abuse, troubleshooting, or legal need." /></label><button className={styles.button} type="button" disabled={rawReason.trim().length < 12} onClick={() => void reviewRawSecurity()}>Open audited security review</button><SimpleTable headers={["Time", "Type", "Route", "Status", "Protected IP", "Client"]} rows={rawEvents.map((event) => [formatDate(event.occurredAt), event.eventType, `${event.method} ${event.route}`, event.responseStatus ?? "-", event.ipAddress ?? "Unavailable", event.userAgentCategory])} empty="No raw security records loaded." /></div> : null}
          <div className={styles.rawForm}>
            <h3>Incident preservation holds</h3>
            <p className={styles.panelText}>A hold temporarily prevents scheduled deletion of protected security events in the selected date range. Holds expire automatically after {configuration.retention.incidentHoldDays} days unless released earlier.</p>
            <label className={styles.field}>Required incident reason<textarea value={holdReason} maxLength={240} onChange={(event) => setHoldReason(event.target.value)} placeholder="Describe the actual incident and why evidence preservation is necessary." /></label>
            <button className={styles.button} type="button" disabled={holdReason.trim().length < 12 || configuration.retention.incidentHoldDays < 1} onClick={() => void updateHold("create")}>Create audited hold for this date range</button>
            {data.preservationHolds.length ? <><label className={styles.field}>Required release reason<textarea value={releaseReason} maxLength={240} onChange={(event) => setReleaseReason(event.target.value)} placeholder="Explain why the preservation hold may be released." /></label><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Held range</th><th>Expires</th><th>Reason</th><th>Action</th></tr></thead><tbody>{data.preservationHolds.map((hold) => <tr key={hold.id}><td>{formatDate(hold.rangeFrom)}<br />through {formatDate(hold.rangeTo)}</td><td>{formatDate(hold.expiresAt)}</td><td>{hold.reason}</td><td><button className={styles.button} type="button" disabled={releaseReason.trim().length < 12} onClick={() => void updateHold("release", hold.id)}>Release hold</button></td></tr>)}</tbody></table></div></> : <p className={styles.empty}>No active preservation holds.</p>}
          </div>
        </Panel>

        <Panel title="Configuration and retention">
          <dl className={styles.definitionList}>
            <dt>Optional analytics</dt><dd>{configuration.optionalAnalyticsEnabled ? "Enabled" : "Disabled"}</dd>
            <dt>Minimum group size</dt><dd>{configuration.minimumGroupSize}</dd>
            <dt>Precise location</dt><dd>Disabled</dd>
            <dt>Age-range survey</dt><dd>Disabled</dd>
            {Object.entries(configuration.retention).map(([key, value]) => <Fragment key={key}><dt>{humanize(key)}</dt><dd>{value} days</dd></Fragment>)}
          </dl>
          {configuration.missingConfiguration.length ? <><p className={styles.method}>Optional production analytics cannot activate while these settings are incomplete:</p><ul className={styles.configList}>{configuration.missingConfiguration.map((item) => <li key={item}>{item}</li>)}</ul></> : null}
        </Panel>

        <Panel title="Protected aggregate export" wide>
          <p className={styles.panelText}>Choose only the aggregate fields needed. Identified requests, signatures, narratives, document contents, and raw security identifiers are excluded.</p>
          <div className={styles.checkboxes}>{EXPORT_FIELDS.map(([value, label]) => <label key={value}><input type="checkbox" checked={exportFields.includes(value)} onChange={() => setExportFields((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])} />{label}</label>)}</div>
          <label className={styles.confirmation}><input type="checkbox" checked={exportConfirmed} onChange={(event) => setExportConfirmed(event.target.checked)} />I confirm that this aggregate export is necessary for an approved operational purpose. My identity, selected fields, date range, creation time, and download will be audited.</label>
          <button className={styles.button} type="button" disabled={!exportConfirmed || !exportFields.length} onClick={() => void createExport()}><Download aria-hidden size={15} />Create protected export</button>
        </Panel>
      </div>
      {message ? <p className={styles.message} role="status">{message}</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </div>
  );
}

function Panel({ title, wide = false, children }: { title: string; wide?: boolean; children: React.ReactNode }) {
  return <section className={`${styles.panel} ${wide ? styles.wide : ""}`}><div className={styles.panelHeader}><h2>{title}</h2></div>{children}</section>;
}

function SimpleTable({ headers, rows, empty }: { headers: string[]; rows: Array<Array<string | number>>; empty: string }) {
  return <div className={styles.tableWrap}><table className={styles.table}><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={`${rowIndex}-${row.join("-")}`}>{row.map((cell, cellIndex) => <td className={cellIndex === row.length - 1 && typeof cell === "number" ? styles.numeric : undefined} key={`${cellIndex}-${cell}`}>{cell}</td>)}</tr>)}{!rows.length ? <tr><td colSpan={headers.length} className={styles.empty}>{empty}</td></tr> : null}</tbody></table></div>;
}

function defaultDates() {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86_400_000);
  return { from: dateInput(from), to: dateInput(to) };
}

function dateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startIso(value: string) {
  return new Date(`${value}T00:00:00.000`).toISOString();
}

function endIso(value: string) {
  return new Date(`${value}T23:59:59.999`).toISOString();
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Chicago" });
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (letter) => letter.toUpperCase());
}
