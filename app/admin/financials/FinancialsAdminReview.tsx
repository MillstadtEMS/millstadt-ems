"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  Clock,
  Download,
  FileSearch,
  FileSignature,
  FileText,
  Globe2,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import {
  ACCURACY_REPORT_STATUSES,
  type AccuracyReportRecord,
  type AccuracyReportStatus,
} from "@/lib/financials-hub/accuracy-types";
import {
  DEVELOPMENT_STATUS_BANNER,
  type AccessRequestRecord,
  type AuditEvent,
  type CatalogDocument,
  type RequestStatus,
} from "@/lib/financials-hub/types";
import type { ManagedDocumentRecord } from "@/lib/financials-hub/document-library";
import FinancialsPrivacyShield from "@/app/financials-information-hub/FinancialsPrivacyShield";

type DecisionDraft = {
  approvedDocIds: string[];
  expirationAtUtc: string;
  reviewReason: string;
};

type ReportReviewDraft = {
  status: AccuracyReportStatus;
  reviewerNote: string;
  resolution: string;
};

const statusOptions: Array<RequestStatus | "all"> = [
  "all",
  "pending",
  "under_review",
  "approved",
  "denied",
  "revoked",
  "expired",
];

const statusLabels: Record<RequestStatus | "all", string> = {
  all: "All statuses",
  pending: "Pending",
  under_review: "Under review",
  approved: "Approved",
  denied: "Denied",
  revoked: "Revoked",
  expired: "Expired",
};

export default function FinancialsAdminReview() {
  const [requests, setRequests] = useState<AccessRequestRecord[]>([]);
  const [accuracyReports, setAccuracyReports] = useState<AccuracyReportRecord[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [docs, setDocs] = useState<CatalogDocument[]>([]);
  const [managedDocs, setManagedDocs] = useState<ManagedDocumentRecord[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadAccess, setUploadAccess] = useState<ManagedDocumentRecord["access"]>(
    "restricted",
  );
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("all");
  const [documentFilter, setDocumentFilter] = useState("all");
  const [drafts, setDrafts] = useState<Record<string, DecisionDraft>>({});
  const [reportDrafts, setReportDrafts] = useState<Record<string, ReportReviewDraft>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void refresh();
  }, []);

  const docsById = useMemo(() => new Map(docs.map((doc) => [doc.id, doc])), [docs]);

  const filteredRequests = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesStatus = statusFilter === "all" || request.status === statusFilter;
      const matchesDocument =
        documentFilter === "all" || request.selectedDocIds.includes(documentFilter);
      const matchesSearch =
        !needle ||
        [
          request.id,
          request.fullLegalName,
          request.verifiedEmail,
          request.city,
          request.state,
          ...request.selectedDocIds.map((id) => docsById.get(id)?.title ?? id),
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      return matchesStatus && matchesDocument && matchesSearch;
    });
  }, [documentFilter, docsById, requests, search, statusFilter]);

  async function refresh() {
    setLoading(true);
    setMessage("");
    try {
      const [requestRes, auditRes, catalogRes, reportRes, documentRes] = await Promise.all([
        fetch("/api/admin/financials/access-requests", { cache: "no-store" }),
        fetch("/api/admin/financials/audit-events", { cache: "no-store" }),
        fetch("/api/financials/documents/catalog", { cache: "no-store" }),
        fetch("/api/admin/financials/accuracy-reports", { cache: "no-store" }),
        fetch("/api/admin/financials/documents", { cache: "no-store" }),
      ]);
      if (!requestRes.ok || !auditRes.ok || !reportRes.ok || !documentRes.ok) {
        setMessage("Admin review is unavailable. Sign in with an authorized admin account.");
        return;
      }
      const requestData = (await requestRes.json()) as { requests: AccessRequestRecord[] };
      const auditData = (await auditRes.json()) as { auditEvents: AuditEvent[] };
      const reportData = (await reportRes.json()) as { reports: AccuracyReportRecord[] };
      const documentData = (await documentRes.json()) as {
        documents: ManagedDocumentRecord[];
      };
      const catalogData = catalogRes.ok
        ? ((await catalogRes.json()) as { documents: CatalogDocument[] })
        : { documents: [] };
      setRequests(requestData.requests);
      setAuditEvents(auditData.auditEvents);
      setAccuracyReports(reportData.reports);
      setDocs(catalogData.documents);
      setManagedDocs(documentData.documents);
      setDrafts((current) => seedDrafts(current, requestData.requests));
      setReportDrafts((current) => seedReportDrafts(current, reportData.reports));
    } finally {
      setLoading(false);
    }
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    setMessage("");
    const form = event.currentTarget;
    const response = await fetch("/api/admin/financials/documents", {
      method: "POST",
      body: new FormData(form),
    });
    const data = (await response.json()) as {
      document?: ManagedDocumentRecord;
      error?: string;
    };
    setUploading(false);
    if (!response.ok || !data.document) {
      setMessage(data.error ?? "The document could not be uploaded.");
      return;
    }
    setMessage(`${data.document.title} was added to the document library.`);
    form.reset();
    setUploadAccess("restricted");
    setUploadOpen(false);
    await refresh();
  }

  async function setDocumentArchived(document: ManagedDocumentRecord, archived: boolean) {
    const response = await fetch(`/api/admin/financials/documents/${document.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived }),
    });
    const data = (await response.json()) as {
      document?: ManagedDocumentRecord;
      error?: string;
    };
    if (!response.ok || !data.document) {
      setMessage(data.error ?? "The document library could not be updated.");
      return;
    }
    setMessage(
      archived
        ? `${data.document.title} was archived.`
        : `${data.document.title} was restored.`,
    );
    await refresh();
  }

  function updateDraft(request: AccessRequestRecord, patch: Partial<DecisionDraft>) {
    setDrafts((current) => ({
      ...current,
      [request.id]: {
        ...(current[request.id] ?? createDraft(request)),
        ...patch,
      },
    }));
  }

  async function runAction(
    request: AccessRequestRecord,
    action: "approve" | "deny" | "revoke" | "expire",
  ) {
    const draft = drafts[request.id] ?? createDraft(request);
    const body =
      action === "approve"
        ? {
            approvedDocIds: draft.approvedDocIds,
            expirationAtUtc: draft.expirationAtUtc,
            reviewReason: draft.reviewReason,
            expectedStatus: request.status,
            expectedRequestVersion: request.requestVersion,
          }
        : {
            reviewReason: draft.reviewReason,
            expectedStatus: request.status,
            expectedRequestVersion: request.requestVersion,
          };

    const res = await fetch(`/api/admin/financials/access-requests/${request.id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { request?: AccessRequestRecord; error?: string };
    if (!res.ok || !data.request) {
      setMessage(data.error ?? "Admin action failed.");
      return;
    }
    setMessage(`${data.request.id} is now ${statusLabels[data.request.status]}.`);
    await refresh();
  }

  async function resetSyntheticData() {
    const res = await fetch("/api/admin/financials/reset", { method: "POST" });
    if (!res.ok) {
      setMessage("Reset failed.");
      return;
    }
    setMessage("Development request data reset.");
    await refresh();
  }

  function updateReportDraft(report: AccuracyReportRecord, patch: Partial<ReportReviewDraft>) {
    setReportDrafts((current) => ({
      ...current,
      [report.id]: {
        ...(current[report.id] ?? createReportDraft(report)),
        ...patch,
      },
    }));
  }

  async function saveReportReview(report: AccuracyReportRecord) {
    const draft = reportDrafts[report.id] ?? createReportDraft(report);
    const response = await fetch(`/api/admin/financials/accuracy-reports/${report.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, expectedStatus: report.status }),
    });
    const data = (await response.json()) as { report?: AccuracyReportRecord; error?: string };
    if (!response.ok || !data.report) {
      setMessage(data.error ?? "Report review could not be saved.");
      return;
    }
    setMessage(`${data.report.id} is now ${data.report.status}.`);
    await refresh();
  }

  function exportAuditLog() {
    const blob = new Blob([JSON.stringify({ auditEvents }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "financial-information-audit-events.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="financials-page financials-admin-page">
      <FinancialsPrivacyShield active />
      <section className="financials-compact-hero">
        <div className="wrap financials-hub-wrap financials-compact-hero__inner">
          <div>
            <p className="financials-kicker">Millstadt EMS Admin</p>
            <h1>Financial and Other Public Requests</h1>
            <p className="financials-hero-copy">
              Publish PDFs and review document-access requests.
            </p>
          </div>
          <span className="financials-status financials-status--dev">
            {DEVELOPMENT_STATUS_BANNER}
          </span>
        </div>
      </section>

      <section className="financials-workspace">
        <div className="wrap financials-hub-wrap financials-workspace__stack">
          <section className="financials-panel financials-admin-library">
            <div className="financials-section-head">
              <div>
                <p className="financials-kicker">Document library</p>
                <h2>Published documents</h2>
              </div>
              <button
                className="financials-primary-button"
                type="button"
                onClick={() => setUploadOpen((current) => !current)}
                aria-expanded={uploadOpen}
                aria-controls="financial-document-upload"
              >
                <Upload aria-hidden="true" />
                Add PDF
              </button>
            </div>

            {uploadOpen && (
              <form
                id="financial-document-upload"
                className="financials-admin-upload"
                onSubmit={uploadDocument}
              >
                <div className="financials-admin-upload__intro">
                  <FileText aria-hidden="true" />
                  <div>
                    <h3>Add a document</h3>
                    <p>
                      Public Form 990s are immediately available. Restricted documents
                      remain blocked until an administrator approves a signed request.
                    </p>
                  </div>
                </div>
                <div className="financials-form-grid">
                  <label className="financials-field financials-field--full">
                    <span>Access</span>
                    <select
                      name="access"
                      value={uploadAccess}
                      onChange={(event) =>
                        setUploadAccess(event.target.value as ManagedDocumentRecord["access"])
                      }
                    >
                      <option value="restricted">Request and approval required</option>
                      <option value="public_form_990">Public Form 990</option>
                    </select>
                  </label>
                  <label className="financials-field financials-field--full">
                    <span>Document title</span>
                    <input name="title" required maxLength={160} />
                  </label>
                  <label className="financials-field">
                    <span>Category</span>
                    <select name="category" defaultValue="Financial report">
                      <option>Financial report</option>
                      <option>Budget</option>
                      <option>Audit</option>
                      <option>Operational</option>
                    </select>
                  </label>
                  <label className="financials-field">
                    <span>Reporting period</span>
                    <input name="reportingPeriod" required maxLength={80} />
                  </label>
                  {uploadAccess === "public_form_990" && (
                    <>
                      <label className="financials-field">
                        <span>Tax year</span>
                        <input name="taxYear" required inputMode="numeric" pattern="[0-9]{4}" />
                      </label>
                      <label className="financials-field">
                        <span>Filing year</span>
                        <input name="filingYear" required inputMode="numeric" pattern="[0-9]{4}" />
                      </label>
                    </>
                  )}
                  <label className="financials-field">
                    <span>Version</span>
                    <input name="version" required maxLength={60} placeholder="1.0" />
                  </label>
                  <label className="financials-field">
                    <span>Publication date</span>
                    <input name="publicationDate" required type="date" />
                  </label>
                  <label className="financials-field financials-field--full">
                    <span>PDF file</span>
                    <input name="file" required type="file" accept="application/pdf,.pdf" />
                    <small>PDF only, up to 20 MB and 200 pages.</small>
                  </label>
                </div>
                <div className="financials-step-actions">
                  <button
                    className="financials-secondary-button"
                    type="button"
                    onClick={() => setUploadOpen(false)}
                  >
                    Cancel
                  </button>
                  <button className="financials-primary-button" type="submit" disabled={uploading}>
                    <Upload aria-hidden="true" />
                    {uploading ? "Checking PDF" : "Publish document"}
                  </button>
                </div>
              </form>
            )}

            <div className="financials-admin-document-list">
              {managedDocs.length === 0 ? (
                <p className="financials-admin-empty">No administrator-uploaded documents yet.</p>
              ) : (
                managedDocs.map((document) => (
                  <article className="financials-admin-document" key={document.id}>
                    <div className="financials-admin-document__icon" aria-hidden="true">
                      {document.access === "public_form_990" ? <Globe2 /> : <LockKeyhole />}
                    </div>
                    <div className="financials-admin-document__body">
                      <strong>{document.title}</strong>
                      <span>
                        {document.id} | {document.reportingPeriod} | Version {document.version} |
                        {` ${document.pageCount} pages`}
                      </span>
                    </div>
                    <span
                      className={`financials-pill${document.archivedAtUtc ? " financials-pill--expired" : ""}`}
                    >
                      {document.archivedAtUtc
                        ? "Archived"
                        : document.access === "public_form_990"
                          ? "Public Form 990"
                          : "Request access"}
                    </span>
                    <div className="financials-admin-document__actions">
                      <a
                        className="financials-secondary-button"
                        href={`/api/admin/financials/documents/${document.id}/file`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <FileSearch aria-hidden="true" />
                        View
                      </a>
                      <button
                        className="financials-secondary-button"
                        type="button"
                        onClick={() => setDocumentArchived(document, !document.archivedAtUtc)}
                      >
                        {document.archivedAtUtc ? (
                          <ArchiveRestore aria-hidden="true" />
                        ) : (
                          <Archive aria-hidden="true" />
                        )}
                        {document.archivedAtUtc ? "Restore" : "Archive"}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="financials-panel">
            <div className="financials-admin-toolbar">
              <label className="financials-field">
                <span>Search</span>
                <div className="financials-search-input">
                  <Search aria-hidden="true" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Name, email, request ID, or document"
                  />
                </div>
              </label>
              <label className="financials-field">
                <span>Status filter</span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as RequestStatus | "all")
                  }
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="financials-field">
                <span>Document filter</span>
                <select
                  value={documentFilter}
                  onChange={(event) => setDocumentFilter(event.target.value)}
                >
                  <option value="all">All documents</option>
                  {docs.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title}
                    </option>
                  ))}
                </select>
              </label>
              <button className="financials-secondary-button" type="button" onClick={refresh}>
                <RefreshCw aria-hidden="true" />
                Refresh
              </button>
              <button className="financials-secondary-button" type="button" onClick={exportAuditLog}>
                <Download aria-hidden="true" />
                Export audit
              </button>
              <button className="financials-secondary-button" type="button" onClick={resetSyntheticData}>
                <RotateCcw aria-hidden="true" />
                Reset requests
              </button>
            </div>
            {message && <p className="financials-admin-message">{message}</p>}
          </section>

          <section className="financials-panel">
            <div className="financials-section-head">
              <div>
                <p className="financials-kicker">Financial and other public requests</p>
                <h2>Admin review</h2>
              </div>
              <span>{loading ? "Loading" : `${filteredRequests.length} shown`}</span>
            </div>
            <div className="financials-admin-table" role="table" aria-label="Restricted document requests">
              <div className="financials-admin-table__head" role="row">
                <span>Applicant</span>
                <span>Requested document</span>
                <span>Status</span>
                <span>Decision</span>
              </div>
              {filteredRequests.map((request) => (
                <AdminRequestRow
                  key={request.id}
                  request={request}
                  docsById={docsById}
                  draft={drafts[request.id] ?? createDraft(request)}
                  auditEvents={auditEvents.filter((event) => event.requestId === request.id)}
                  onDraftChange={(patch) => updateDraft(request, patch)}
                  onAction={(action) => runAction(request, action)}
                />
              ))}
            </div>
          </section>

          <section className="financials-panel">
            <div className="financials-section-head">
              <div>
                <p className="financials-kicker">Document concerns</p>
                <h2>Accuracy report review</h2>
              </div>
              <span>{loading ? "Loading" : `${accuracyReports.length} received`}</span>
            </div>
            <div className="financials-admin-stack">
              {accuracyReports.map((report) => (
                <AdminAccuracyReportRow
                  key={report.id}
                  report={report}
                  draft={reportDrafts[report.id] ?? createReportDraft(report)}
                  onDraftChange={(patch) => updateReportDraft(report, patch)}
                  onSave={() => saveReportReview(report)}
                />
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function AdminAccuracyReportRow({
  report,
  draft,
  onDraftChange,
  onSave,
}: {
  report: AccuracyReportRecord;
  draft: ReportReviewDraft;
  onDraftChange: (patch: Partial<ReportReviewDraft>) => void;
  onSave: () => void;
}) {
  return (
    <article className="financials-admin-request">
      <div className="financials-admin-request__top">
        <div>
          <strong>{report.documentTitle}</strong>
          <span>{report.id} | {report.category}</span>
        </div>
        <span className="financials-pill">{report.status}</span>
      </div>
      <dl className="financials-admin-dl">
        <MetaRow label="Reporter" value={report.reporterName} />
        <MetaRow label="Email" value={report.reporterEmail} />
        <MetaRow label="Telephone" value={report.reporterTelephone || "Not provided"} />
        <MetaRow label="Document ID" value={report.documentId} />
        <MetaRow label="Version" value={report.documentVersion} />
        <MetaRow label="Location" value={report.pageOrSection} />
        <MetaRow label="Submitted" value={report.submittedAtUtc} />
      </dl>
      <div className="financials-admin-other">
        <strong>Specific concern</strong>
        <p>{report.description}</p>
        <strong>Supporting source</strong>
        <p>{report.supportingSource || "Not provided"}</p>
      </div>
      {report.flags.length > 0 && (
        <div className="financials-flags">
          <strong>Flagged for extra attention</strong>
          <ul>{report.flags.map((flag) => <li key={flag}>{flag}</li>)}</ul>
        </div>
      )}
      <div className="financials-admin-actions">
        <a className="financials-secondary-button" href={report.sourceUrl} target="_blank" rel="noreferrer">
          <FileSearch aria-hidden="true" /> Referenced document
        </a>
        <a className="financials-secondary-button" href={`mailto:${report.reporterEmail}`}>Contact reporter</a>
        <a
          className="financials-secondary-button"
          href={`/api/admin/financials/accuracy-reports/${report.id}/agreement`}
          target="_blank"
          rel="noreferrer"
        >
          <FileSignature aria-hidden="true" /> Signed report
        </a>
        {report.upload && (
          <a className="financials-secondary-button" href={`/api/admin/financials/accuracy-reports/${report.id}/upload`}>
            <Download aria-hidden="true" /> Supporting upload
          </a>
        )}
      </div>
      <div className="financials-form-grid">
        <label className="financials-field">
          <span>Status</span>
          <select
            value={draft.status}
            onChange={(event) => onDraftChange({ status: event.target.value as AccuracyReportStatus })}
          >
            {ACCURACY_REPORT_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </label>
        <label className="financials-field financials-field--full">
          <span>Private reviewer note</span>
          <textarea
            value={draft.reviewerNote}
            onChange={(event) => onDraftChange({ reviewerNote: event.target.value })}
          />
        </label>
        <label className="financials-field financials-field--full">
          <span>Resolution record</span>
          <textarea
            value={draft.resolution}
            onChange={(event) => onDraftChange({ resolution: event.target.value })}
          />
        </label>
      </div>
      <div className="financials-step-actions">
        <button type="button" onClick={onSave}>Save review</button>
      </div>
      <details className="financials-disclosure financials-admin-row-details">
        <summary>Audit history</summary>
        <div className="financials-audit-list">
          {report.activity.map((activity) => (
            <div key={activity.id}>
              <strong>{activity.eventType}</strong>
              <span>{activity.timestampUtc}</span>
              <p>{activity.reason}</p>
            </div>
          ))}
        </div>
      </details>
    </article>
  );
}

function AdminRequestRow({
  request,
  docsById,
  draft,
  auditEvents,
  onDraftChange,
  onAction,
}: {
  request: AccessRequestRecord;
  docsById: Map<string, CatalogDocument>;
  draft: DecisionDraft;
  auditEvents: AuditEvent[];
  onDraftChange: (patch: Partial<DecisionDraft>) => void;
  onAction: (action: "approve" | "deny" | "revoke" | "expire") => void;
}) {
  const requestedDocs = request.selectedDocIds
    .map((id) => docsById.get(id))
    .filter((doc): doc is CatalogDocument => Boolean(doc));

  return (
    <article className="financials-admin-table__row" role="row">
      <div>
        <strong>{request.fullLegalName}</strong>
        <span>{request.verifiedEmail}</span>
        <span>{request.city}, {request.state} {request.postalCode}</span>
        <code>{request.id}</code>
      </div>
      <div>
        <ul className="financials-plain-list">
          {requestedDocs.map((doc) => (
            <li key={doc.id}>{doc.title}</li>
          ))}
        </ul>
        {request.flags.length > 0 && (
          <details className="financials-disclosure financials-admin-row-details">
            <summary>Flagged for extra attention</summary>
            <ul>
              {request.flags.map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
      <div>
        <StatusBadge status={request.status} />
        <span>Submitted {request.submittedAtUtc}</span>
        <span>Terms {request.termsVersion}</span>
        <span>Accepted {request.acceptedAtUtc}</span>
        {request.agreementFilename && (
          <a
            className="financials-secondary-button financials-agreement-link"
            href={`/api/admin/financials/access-requests/${request.id}/agreement`}
            target="_blank"
            rel="noreferrer"
          >
            <FileSignature aria-hidden="true" />
            Signed request PDF
          </a>
        )}
      </div>
      <div className="financials-admin-decision">
        <fieldset>
          <legend>Approve documents</legend>
          {requestedDocs.map((doc) => (
            <label key={doc.id} className="financials-checkbox-row">
              <input
                type="checkbox"
                checked={draft.approvedDocIds.includes(doc.id)}
                onChange={(event) => {
                  const approvedDocIds = event.target.checked
                    ? [...draft.approvedDocIds, doc.id]
                    : draft.approvedDocIds.filter((id) => id !== doc.id);
                  onDraftChange({ approvedDocIds });
                }}
              />
              <span>{doc.title}</span>
            </label>
          ))}
        </fieldset>
        <label className="financials-field">
          <span>Expiration date</span>
          <input
            type="datetime-local"
            value={draft.expirationAtUtc}
            onChange={(event) => onDraftChange({ expirationAtUtc: event.target.value })}
          />
        </label>
        <label className="financials-field">
          <span>Review note</span>
          <input
            value={draft.reviewReason}
            onChange={(event) => onDraftChange({ reviewReason: event.target.value })}
          />
        </label>
        <div className="financials-admin-actions">
          <button type="button" onClick={() => onAction("approve")}>
            <CheckCircle2 aria-hidden="true" />
            Approve
          </button>
          <button type="button" onClick={() => onAction("deny")}>
            <XCircle aria-hidden="true" />
            Deny
          </button>
          <button type="button" onClick={() => onAction("revoke")}>
            <ShieldCheck aria-hidden="true" />
            Revoke
          </button>
          <button type="button" onClick={() => onAction("expire")}>
            <Clock aria-hidden="true" />
            Expire
          </button>
        </div>
        <details className="financials-disclosure financials-admin-row-details">
          <summary>Audit history</summary>
          <div className="financials-audit-list">
            {auditEvents.map((event) => (
              <div key={event.id}>
                <strong>{event.eventType}</strong>
                <span>{event.timestampUtc}</span>
                <p>{event.reason}</p>
              </div>
            ))}
          </div>
        </details>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={`financials-pill financials-pill--${status}`}>
      {statusLabels[status]}
    </span>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function createDraft(request: AccessRequestRecord): DecisionDraft {
  return {
    approvedDocIds: request.approvedDocIds.length
      ? request.approvedDocIds
      : request.selectedDocIds,
    expirationAtUtc: toDatetimeLocal(request.expirationAtUtc),
    reviewReason: request.reviewReason ?? "",
  };
}

function seedDrafts(
  current: Record<string, DecisionDraft>,
  requests: AccessRequestRecord[],
) {
  const next = { ...current };
  for (const request of requests) {
    if (!next[request.id]) next[request.id] = createDraft(request);
  }
  return next;
}

function createReportDraft(report: AccuracyReportRecord): ReportReviewDraft {
  return {
    status: report.status,
    reviewerNote: report.reviewerNote,
    resolution: report.resolution,
  };
}

function seedReportDrafts(
  current: Record<string, ReportReviewDraft>,
  reports: AccuracyReportRecord[],
) {
  const next = { ...current };
  for (const report of reports) {
    if (!next[report.id]) next[report.id] = createReportDraft(report);
  }
  return next;
}

function toDatetimeLocal(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}
