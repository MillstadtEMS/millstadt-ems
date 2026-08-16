import { accuracyReports } from "@/lib/financials-hub/accuracy-store";
import { getFinancialsHubConfig } from "@/lib/financials-hub/config";
import { auditEvents, snapshot } from "@/lib/financials-hub/dev-store";
import type { AnalyticsSummary } from "./types";

const EMPTY_WORKFLOW: AnalyticsSummary["workflow"] = {
  restrictedRequests: 0,
  approvals: 0,
  denials: 0,
  expirations: 0,
  revocations: 0,
  controlledViews: 0,
};

export function financialWorkflowAnalytics(from: Date, to: Date) {
  const financials = getFinancialsHubConfig();
  if (!financials.enabled || !financials.syntheticDataOnly) {
    return {
      workflow: { ...EMPTY_WORKFLOW },
      identifiedWorkflows: { accessRequests: [], accuracyReports: [] },
    };
  }

  const events = auditEvents().filter((event) => inRange(event.timestampUtc, from, to));
  const workflow: AnalyticsSummary["workflow"] = {
    restrictedRequests: countEvents(events, "access_request_submitted"),
    approvals: countEvents(events, "approval_granted"),
    denials: countEvents(events, "approval_denied"),
    expirations: countEvents(events, "approval_expired"),
    revocations: countEvents(events, "approval_revoked"),
    controlledViews: countEvents(events, "document_view_started"),
  };
  const accessRequests = snapshot().requests
    .filter((request) => inRange(request.submittedAtUtc, from, to))
    .map((request) => ({
      id: request.id,
      name: request.fullLegalName,
      email: request.verifiedEmail,
      selectedDocuments: request.selectedDocIds,
      status: request.status,
      submittedAt: request.submittedAtUtc,
      agreementFilename: request.agreementFilename ?? null,
      flags: request.flags,
      administratorActions: events
        .filter((event) => event.requestId === request.id && event.administratorId)
        .map((event) => ({
          eventType: event.eventType,
          timestamp: event.timestampUtc,
          administratorId: event.administratorId as string,
          result: event.result,
        })),
    }));
  const reports = accuracyReports()
    .filter((report) => inRange(report.submittedAtUtc, from, to))
    .map((report) => ({
      id: report.id,
      name: report.reporterName,
      email: report.reporterEmail,
      documentTitle: report.documentTitle,
      status: report.status,
      submittedAt: report.submittedAtUtc,
      agreementFilename: report.agreementFilename,
      flags: report.flags,
      administratorActions: report.activity
        .filter(
          (event) =>
            event.administratorId && inRange(event.timestampUtc, from, to),
        )
        .map((event) => ({
          eventType: event.eventType,
          timestamp: event.timestampUtc,
          administratorId: event.administratorId as string,
          result: "recorded",
        })),
    }));
  return {
    workflow,
    identifiedWorkflows: { accessRequests, accuracyReports: reports },
  };
}

function countEvents(events: Array<{ eventType: string }>, eventType: string) {
  return events.filter((event) => event.eventType === eventType).length;
}

function inRange(value: string, from: Date, to: Date) {
  const time = Date.parse(value);
  return time >= from.getTime() && time <= to.getTime();
}
