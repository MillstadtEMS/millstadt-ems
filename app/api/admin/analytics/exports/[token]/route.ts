import { NextRequest } from "next/server";
import { requireAnalyticsSupervisor } from "@/lib/analytics/auth";
import { consumeAnalyticsExport, getAnalyticsSummary } from "@/lib/analytics/store";
import { financialWorkflowAnalytics } from "@/lib/analytics/financial-workflows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const authorized = await requireAnalyticsSupervisor();
  if ("response" in authorized) return authorized.response;
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return new Response("Invalid or expired export.", { status: 404 });
  }
  const exportRecord = await consumeAnalyticsExport(token, authorized.employee.id);
  if (!exportRecord) return new Response("Invalid or expired export.", { status: 404 });
  const summary = await getAnalyticsSummary(
    new Date(exportRecord.rangeFrom),
    new Date(exportRecord.rangeTo),
  );
  summary.workflow = financialWorkflowAnalytics(
    new Date(exportRecord.rangeFrom),
    new Date(exportRecord.rangeTo),
  ).workflow;
  const csv = analyticsCsv(summary, exportRecord.fields);
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="millstadt-analytics-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function analyticsCsv(summary: Awaited<ReturnType<typeof getAnalyticsSummary>>, fields: string[]) {
  const rows: string[][] = [["Section", "Metric", "Category", "Value"]];
  if (fields.includes("overview")) {
    for (const [metric, value] of Object.entries(summary.overview)) {
      rows.push(["Overview", metric, "", String(value)]);
    }
  }
  if (fields.includes("topPages")) {
    for (const row of summary.topPages) rows.push(["Top pages", "views", row.path, String(row.views)]);
  }
  if (fields.includes("documentActivity")) {
    for (const row of summary.documentEvents) {
      rows.push(["Document activity", row.eventName, row.documentKind, String(row.events)]);
    }
  }
  if (fields.includes("geography")) {
    for (const row of summary.geography) rows.push(["Geography", "events", row.broadArea, String(row.events)]);
  }
  if (fields.includes("returning")) {
    rows.push(["Returning estimates", "aggregateVisitFrequency", "", String(summary.returning.aggregateVisitFrequency)]);
    rows.push(["Returning estimates", "averageReturnIntervalDays", "", String(summary.returning.averageReturnIntervalDays)]);
  }
  if (fields.includes("securitySummary")) {
    for (const [metric, value] of Object.entries(summary.security)) {
      rows.push(["Security summary", metric, "", String(value)]);
    }
  }
  if (fields.includes("workflow")) {
    for (const [metric, value] of Object.entries(summary.workflow)) {
      rows.push(["Document workflow", metric, "", String(value)]);
    }
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function csvCell(value: string) {
  const safe = /^[=+@-]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
