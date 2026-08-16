"use client";

import {
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Pause,
  Play,
  Printer,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Square,
  Upload,
  Volume2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FinancialsSignaturePad, {
  type FinancialsSignature,
} from "./FinancialsSignaturePad";
import FinancialsPrivacyShield, {
  SENSITIVE_CAPTURE_NOTICE,
} from "./FinancialsPrivacyShield";
import styles from "./FinancialsArchivePrototype.module.css";
import {
  ACCURACY_CERTIFICATION,
  ACCURACY_CONTACT_ACKNOWLEDGMENT,
  ACCURACY_IDENTITY_HELP,
  ACCURACY_PRIVACY_NOTICE,
  ACCURACY_REPORT_CATEGORIES,
  ACCURACY_REPORT_INTRO,
  ACCURACY_REPORT_RESULT,
  ACCURACY_UPLOAD_NOTICE,
  type AccuracyReportRecord,
} from "@/lib/financials-hub/accuracy-types";
import {
  ACCEPTED_BUTTON_TEXT,
  ACCEPTED_CHECKBOX_TEXT,
  ACCURATE_IDENTIFICATION_NOTICE,
  AI_PROCESSING_NOTICE,
  PRIVACY_NOTICE,
  PROMINENT_LEGAL_NOTICE,
  PUBLIC_FINANCIALS_PAGE_SUBTITLE,
  PUBLIC_FINANCIALS_PAGE_TITLE,
  RELEASE_TERMS,
  RESTRICTED_VIEWER_NOTICE,
  RUN_COUNT_METHODOLOGY_NOTICE,
  type AccessRequestRecord,
  type CatalogDocument,
  type RequestStatus,
  type ViewerSession,
} from "@/lib/financials-hub/types";
import type { PublicForm990CatalogItem } from "@/lib/financials-hub/form990";

type RequestStep = 1 | 2 | 3;
type LibraryStep = 1 | 2;

type FormState = {
  fullLegalName: string;
  verifiedEmail: string;
  mailingAddress: string;
  city: string;
  state: string;
  postalCode: string;
};

type ViewerPage = {
  session: ViewerSession;
  document: {
    id: string;
    title: string;
    version: string;
    publicationDate: string;
    originalHash: string;
    individualizedHash: string;
    pageCount: number;
  };
  pageNumber: number;
  pageText: string;
  viewedAtUtc: string;
  watermark: string;
  footerText: string;
};

type Form990CatalogState = {
  heading: string;
  intro: string[];
  notice: string[];
  aiNotice: string[];
  reviewNotice: string[];
  documents: PublicForm990CatalogItem[];
};

type SpeechState = {
  id: string | null;
  status: "idle" | "playing" | "paused";
  rate: number;
};

type NoticeGroup = {
  heading?: string;
  paragraphs: string[];
};

type AccuracyTarget = {
  id: string;
  title: string;
  version: string;
  sourceUrl: string;
  pageOrSection: string;
};

type AccuracyFormState = {
  reporterName: string;
  reporterEmail: string;
  reporterTelephone: string;
  category: string;
  pageOrSection: string;
  description: string;
  supportingSource: string;
};

type AccuracyReportReceipt = Pick<
  AccuracyReportRecord,
  "id" | "status" | "submittedAtUtc"
>;

const emptyForm: FormState = {
  fullLegalName: "",
  verifiedEmail: "",
  mailingAddress: "",
  city: "",
  state: "IL",
  postalCode: "",
};

const emptyAccuracyForm: AccuracyFormState = {
  reporterName: "",
  reporterEmail: "",
  reporterTelephone: "",
  category: "",
  pageOrSection: "",
  description: "",
  supportingSource: "",
};

const emptySignature = (legalName = ""): FinancialsSignature => ({
  method: "drawn",
  dataUrl: "",
  typedName: legalName,
});

const statusDescriptions: Record<RequestStatus, string> = {
  pending: "Your request is awaiting administrative review.",
  under_review: "Your request is under administrative review.",
  approved: "Access is approved for the documents and period shown below.",
  denied: "Access was not approved for this request.",
  revoked: "Access has been revoked and is no longer available.",
  expired: "The approval period has ended.",
};

const statusLabels: Record<RequestStatus, string> = {
  pending: "Pending",
  under_review: "Under review",
  approved: "Approved",
  denied: "Denied",
  revoked: "Revoked",
  expired: "Expired",
};

function isViewerPage(data: unknown): data is ViewerPage {
  if (!data || typeof data !== "object") return false;
  const page = data as Partial<ViewerPage>;
  return (
    typeof page.pageNumber === "number" &&
    typeof page.pageText === "string" &&
    typeof page.watermark === "string" &&
    typeof page.footerText === "string" &&
    Boolean(page.session) &&
    Boolean(page.document)
  );
}

export default function FinancialsArchivePrototype() {
  const [libraryStep, setLibraryStep] = useState<LibraryStep>(1);
  const [requestStep, setRequestStep] = useState<RequestStep>(1);
  const [catalogDocs, setCatalogDocs] = useState<CatalogDocument[]>([]);
  const [form990Catalog, setForm990Catalog] = useState<Form990CatalogState | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [selectedForm990Ids, setSelectedForm990Ids] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [accepted, setAccepted] = useState(false);
  const [signature, setSignature] = useState<FinancialsSignature>(emptySignature());
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [form990NoticeOpen, setForm990NoticeOpen] = useState(false);
  const [restrictedNoticeOpen, setRestrictedNoticeOpen] = useState(false);
  const [countingNoticeOpen, setCountingNoticeOpen] = useState(false);
  const [correctionsNoticeOpen, setCorrectionsNoticeOpen] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState<AccessRequestRecord | null>(null);
  const [myRequests, setMyRequests] = useState<AccessRequestRecord[]>([]);
  const [viewerPage, setViewerPage] = useState<ViewerPage | null>(null);
  const [zoom, setZoom] = useState(1);
  const [speech, setSpeech] = useState<SpeechState>({ id: null, status: "idle", rate: 1 });
  const [accuracyTarget, setAccuracyTarget] = useState<AccuracyTarget | null>(null);
  const [accuracyForm, setAccuracyForm] = useState<AccuracyFormState>(emptyAccuracyForm);
  const [accuracyUpload, setAccuracyUpload] = useState<File | null>(null);
  const [accuracyCertification, setAccuracyCertification] = useState(false);
  const [accuracyContactAcknowledgment, setAccuracyContactAcknowledgment] = useState(false);
  const [accuracySignature, setAccuracySignature] = useState<FinancialsSignature>(emptySignature());
  const [accuracySignatureOpen, setAccuracySignatureOpen] = useState(false);
  const [accuracySigned, setAccuracySigned] = useState(false);
  const [accessCsrfToken, setAccessCsrfToken] = useState("");
  const [accessIdempotencyKey, setAccessIdempotencyKey] = useState("");
  const [accuracyCsrfToken, setAccuracyCsrfToken] = useState("");
  const [accuracyIdempotencyKey, setAccuracyIdempotencyKey] = useState("");
  const [accuracyErrors, setAccuracyErrors] = useState<string[]>([]);
  const [accuracySubmitting, setAccuracySubmitting] = useState(false);
  const [submittedAccuracyReport, setSubmittedAccuracyReport] = useState<AccuracyReportReceipt | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setAccessIdempotencyKey(window.crypto.randomUUID());
    void Promise.all([
      refreshCatalog(),
      refreshForm990Catalog(),
      prepareAccessRequestSubmission(),
    ]);
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const docsById = useMemo(
    () => new Map(catalogDocs.map((doc) => [doc.id, doc])),
    [catalogDocs],
  );
  const selectedDocs = selectedDocIds
    .map((documentId) => docsById.get(documentId))
    .filter((doc): doc is CatalogDocument => Boolean(doc));
  const selectedForm990s = (form990Catalog?.documents ?? []).filter((doc) =>
    selectedForm990Ids.includes(doc.id),
  );

  const loadViewerPage = useCallback(
    async (
      pageNumber: number,
      session = viewerPage?.session,
      userId = viewerPage?.session.userId,
    ) => {
      if (!session || !userId) return;
      const boundedPage = Math.min(
        Math.max(pageNumber, 1),
        viewerPage?.document.pageCount ?? 99,
      );
      try {
        const response = await fetch(
          `/api/financials/viewer-sessions/${session.id}/pages/${boundedPage}`,
          {
            cache: "no-store",
            headers: { "x-millstadt-user-id": userId },
          },
        );
        const data = (await response.json()) as unknown;
        if (!response.ok || !isViewerPage(data)) {
          const errorData = data as { error?: string };
          setViewerPage(null);
          setZoom(1);
          setErrors([errorData.error ?? "Viewer access ended."]);
          return;
        }
        setViewerPage(data);
      } catch {
        setViewerPage(null);
        setZoom(1);
        setErrors(["The viewer connection was interrupted. Reopen the approved document to continue."]);
      }
    },
    [viewerPage],
  );

  useEffect(() => {
    if (!viewerPage) return;
    const activeViewerPage = viewerPage;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") void loadViewerPage(activeViewerPage.pageNumber - 1);
      if (event.key === "ArrowRight") void loadViewerPage(activeViewerPage.pageNumber + 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loadViewerPage, viewerPage]);

  async function refreshCatalog() {
    try {
      const response = await fetch("/api/financials/documents/catalog", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { documents: CatalogDocument[] };
      setCatalogDocs(data.documents);
    } catch {
      setErrors(["The document list could not be loaded. Refresh the page to try again."]);
    }
  }

  async function refreshForm990Catalog() {
    try {
      const response = await fetch("/api/financials/form-990/catalog", { cache: "no-store" });
      if (!response.ok) return;
      setForm990Catalog((await response.json()) as Form990CatalogState);
    } catch {
      setErrors(["The public filing list could not be loaded. Refresh the page to try again."]);
    }
  }

  async function prepareAccessRequestSubmission() {
    try {
      const response = await fetch("/api/financials/access-requests", { cache: "no-store" });
      const data = (await response.json()) as { csrfToken?: string };
      setAccessCsrfToken(response.ok ? data.csrfToken ?? "" : "");
    } catch {
      setAccessCsrfToken("");
    }
  }

  function updateForm(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleDocument(documentId: string) {
    setSelectedDocIds((current) =>
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId],
    );
    setErrors([]);
  }

  function toggleForm990(documentId: string) {
    setSelectedForm990Ids((current) =>
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId],
    );
    setErrors([]);
  }

  function validateApplicantInformation() {
    const nextErrors: string[] = [];
    const required: Array<[string, string]> = [
      ["Full name", form.fullLegalName],
      ["Email address", form.verifiedEmail],
      ["Mailing address", form.mailingAddress],
      ["City", form.city],
      ["State", form.state],
      ["ZIP code", form.postalCode],
    ];
    for (const [label, value] of required) {
      if (!value.trim()) nextErrors.push(`${label} is required.`);
    }
    if (
      form.verifiedEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.verifiedEmail.trim())
    ) {
      nextErrors.push("Email address must be formatted like an email address.");
    }
    setErrors(nextErrors);
    return nextErrors.length === 0;
  }

  function openTerms() {
    if (!validateApplicantInformation()) return;
    setAccepted(false);
    setSignature(emptySignature(form.fullLegalName));
    setSignatureOpen(false);
    setTermsOpen(true);
    stopSpeech();
  }

  function requestSignature() {
    setAccepted(false);
    setSignature(emptySignature(form.fullLegalName));
    setSignatureOpen(true);
    setErrors([]);
  }

  function applySignature() {
    const valid =
      (signature.method === "drawn" && Boolean(signature.dataUrl)) ||
      (signature.method === "typed" &&
        normalizeIdentity(signature.typedName) === normalizeIdentity(form.fullLegalName));
    if (!valid) {
      setErrors([
        signature.method === "drawn"
          ? "Sign in the signature box before continuing."
          : "The typed signature must match the full name on the request.",
      ]);
      return;
    }
    setAccepted(true);
    setSignatureOpen(false);
    setErrors([]);
  }

  async function submitAccessRequest() {
    if (!validateApplicantInformation()) return;
    if (!selectedDocIds.length) {
      setErrors(["Choose at least one listed document."]);
      setRequestStep(1);
      setTermsOpen(false);
      return;
    }
    if (!accepted) {
      setErrors(["A signed acknowledgment is required before submission."]);
      return;
    }
    if (!accessCsrfToken || !accessIdempotencyKey) {
      setErrors(["The request form is still preparing. Wait a moment and try again."]);
      void prepareAccessRequestSubmission();
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/financials/access-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": accessCsrfToken,
        },
        body: JSON.stringify({
          idempotencyKey: accessIdempotencyKey,
          fullLegalName: form.fullLegalName,
          verifiedEmail: form.verifiedEmail,
          mailingAddress: form.mailingAddress,
          addressLine2: "",
          city: form.city,
          state: form.state,
          postalCode: form.postalCode,
          selectedDocIds,
          requestedInformationDescription: "",
          acceptedCheckboxText: ACCEPTED_CHECKBOX_TEXT,
          acceptedButtonText: ACCEPTED_BUTTON_TEXT,
          signatureMethod: signature.method,
          signatureDataUrl: signature.method === "drawn" ? signature.dataUrl : "",
          signatureTypedName: signature.method === "typed" ? signature.typedName : "",
        }),
      });
      const data = (await response.json()) as { request?: AccessRequestRecord; error?: string };
      if (!response.ok || !data.request) {
        setErrors([data.error ?? "Request could not be submitted."]);
        return;
      }
      setSubmittedRequest(data.request);
      setMyRequests((current) => [data.request as AccessRequestRecord, ...current]);
      setRequestStep(3);
      setTermsOpen(false);
      setSignatureOpen(false);
      setAccepted(false);
      setErrors([]);
    } catch {
      setErrors([
        "The network connection was interrupted. Your information is still here; try submitting again.",
      ]);
    } finally {
      setSubmitting(false);
    }
  }

  async function refreshMyRequests() {
    const userIds = Array.from(new Set(myRequests.map((request) => request.userId)));
    if (!userIds.length) return;
    setRefreshing(true);
    try {
      const responses = await Promise.all(
        userIds.map((userId) =>
          fetch("/api/financials/access-requests/me", {
            cache: "no-store",
            headers: { "x-millstadt-user-id": userId },
          }),
        ),
      );
      const payloads = await Promise.all(
        responses.map((response) => response.json() as Promise<{ requests?: AccessRequestRecord[] }>),
      );
      setMyRequests(
        payloads
          .flatMap((payload) => payload.requests ?? [])
          .sort((a, b) => b.submittedAtUtc.localeCompare(a.submittedAtUtc)),
      );
    } catch {
      setErrors(["The request status could not be refreshed. Your request information is still available here."]);
    } finally {
      setRefreshing(false);
    }
  }

  async function beginViewer(request: AccessRequestRecord, doc: CatalogDocument) {
    try {
      const response = await fetch("/api/financials/viewer-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id, documentId: doc.id, userId: request.userId }),
      });
      const data = (await response.json()) as { session?: ViewerSession; error?: string };
      if (!response.ok || !data.session) {
        setErrors([data.error ?? "Viewer could not be opened."]);
        return;
      }
      setZoom(1);
      await loadViewerPage(1, data.session, request.userId);
    } catch {
      setErrors(["The viewer could not be opened because the connection was interrupted."]);
    }
  }

  function startAnotherRequest() {
    setLibraryStep(1);
    setRequestStep(1);
    setForm(emptyForm);
    setSelectedDocIds([]);
    setSelectedForm990Ids([]);
    setSubmittedRequest(null);
    setSignature(emptySignature());
    setAccessIdempotencyKey(window.crypto.randomUUID());
    void prepareAccessRequestSubmission();
    setErrors([]);
  }

  function closeViewer() {
    setViewerPage(null);
    setZoom(1);
    stopSpeech();
  }

  async function openAccuracyReport(target: AccuracyTarget) {
    setAccuracyTarget(target);
    setAccuracyForm({ ...emptyAccuracyForm, pageOrSection: target.pageOrSection });
    setAccuracyUpload(null);
    setAccuracyCertification(false);
    setAccuracyContactAcknowledgment(false);
    setAccuracySignature(emptySignature());
    setAccuracySignatureOpen(false);
    setAccuracySigned(false);
    setAccuracyErrors([]);
    setSubmittedAccuracyReport(null);
    setAccuracyIdempotencyKey(window.crypto.randomUUID());
    stopSpeech();
    try {
      const response = await fetch("/api/financials/accuracy-reports", { cache: "no-store" });
      const data = (await response.json()) as { csrfToken?: string; error?: string };
      if (!response.ok || !data.csrfToken) {
        setAccuracyErrors([data.error ?? "The report form could not be prepared."]);
        return;
      }
      setAccuracyCsrfToken(data.csrfToken);
    } catch {
      setAccuracyErrors(["The report form could not be prepared."]);
    }
  }

  function closeAccuracyReport() {
    setAccuracyTarget(null);
    setAccuracySignatureOpen(false);
    setAccuracySigned(false);
    setAccuracyErrors([]);
    stopSpeech();
  }

  function updateAccuracyForm(field: keyof AccuracyFormState, value: string) {
    setAccuracyForm((current) => ({ ...current, [field]: value }));
    if (field === "reporterName" && accuracySigned) {
      setAccuracySigned(false);
      setAccuracySignature(emptySignature(value));
    }
    setAccuracyErrors([]);
  }

  function openAccuracySignature() {
    setAccuracySigned(false);
    setAccuracySignature(emptySignature(accuracyForm.reporterName));
    setAccuracySignatureOpen(true);
    setAccuracyErrors([]);
  }

  function applyAccuracySignature() {
    const valid =
      (accuracySignature.method === "drawn" && Boolean(accuracySignature.dataUrl)) ||
      (accuracySignature.method === "typed" &&
        normalizeIdentity(accuracySignature.typedName) ===
          normalizeIdentity(accuracyForm.reporterName));
    if (!valid) {
      setAccuracyErrors([
        accuracySignature.method === "drawn"
          ? "Sign in the signature box before continuing."
          : "The typed signature must match the full name on the report.",
      ]);
      return;
    }
    setAccuracySigned(true);
    setAccuracySignatureOpen(false);
    setAccuracyErrors([]);
  }

  function validateAccuracyReport() {
    const nextErrors: string[] = [];
    const required: Array<[string, string]> = [
      ["Full name", accuracyForm.reporterName],
      ["Email address", accuracyForm.reporterEmail],
      ["What you are reporting", accuracyForm.category],
      ["Page, section, statement, or location", accuracyForm.pageOrSection],
      ["Specific concern", accuracyForm.description],
    ];
    for (const [label, value] of required) {
      if (!value.trim()) nextErrors.push(`${label} is required.`);
    }
    if (
      accuracyForm.reporterEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accuracyForm.reporterEmail.trim())
    ) {
      nextErrors.push("Email address must be formatted like an email address.");
    }
    if (!accuracyCertification || !accuracyContactAcknowledgment) {
      nextErrors.push("Both acknowledgments are required.");
    }
    if (!accuracySigned) nextErrors.push("A signature is required.");
    if (!accuracyCsrfToken) nextErrors.push("The report form is not ready. Close it and try again.");
    setAccuracyErrors(nextErrors);
    return nextErrors.length === 0;
  }

  async function submitAccuracyReport() {
    if (!accuracyTarget || !validateAccuracyReport()) return;
    setAccuracySubmitting(true);
    try {
      const body = new FormData();
      body.set("idempotencyKey", accuracyIdempotencyKey);
      body.set("documentId", accuracyTarget.id);
      body.set("sourceUrl", accuracyTarget.sourceUrl);
      body.set("pageOrSection", accuracyForm.pageOrSection);
      body.set("category", accuracyForm.category);
      body.set("description", accuracyForm.description);
      body.set("supportingSource", accuracyForm.supportingSource);
      body.set("reporterName", accuracyForm.reporterName);
      body.set("reporterEmail", accuracyForm.reporterEmail);
      body.set("reporterTelephone", accuracyForm.reporterTelephone);
      body.set("certificationAccepted", String(accuracyCertification));
      body.set("contactAcknowledgmentAccepted", String(accuracyContactAcknowledgment));
      body.set("certificationText", ACCURACY_CERTIFICATION.join("\n\n"));
      body.set("contactAcknowledgmentText", ACCURACY_CONTACT_ACKNOWLEDGMENT);
      body.set("signatureMethod", accuracySignature.method);
      body.set("signatureDataUrl", accuracySignature.method === "drawn" ? accuracySignature.dataUrl : "");
      body.set("signatureTypedName", accuracySignature.method === "typed" ? accuracySignature.typedName : "");
      if (accuracyUpload) body.set("supportingDocument", accuracyUpload);

      const response = await fetch("/api/financials/accuracy-reports", {
        method: "POST",
        headers: { "x-csrf-token": accuracyCsrfToken },
        body,
      });
      const data = (await response.json()) as {
        report?: AccuracyReportReceipt;
        error?: string;
      };
      if (!response.ok || !data.report) {
        setAccuracyErrors([data.error ?? "The report could not be submitted."]);
        return;
      }
      setSubmittedAccuracyReport(data.report);
      setAccuracyErrors([]);
      setAccuracySignatureOpen(false);
      stopSpeech();
    } catch {
      setAccuracyErrors(["The report could not be submitted."]);
    } finally {
      setAccuracySubmitting(false);
    }
  }

  function readText(id: string, text: string) {
    if (!("speechSynthesis" in window)) return;
    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speech.rate;
    utterance.onend = () =>
      setSpeech((current) =>
        current.id === id ? { ...current, id: null, status: "idle" } : current,
      );
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setSpeech((current) => ({ ...current, id, status: "playing" }));
  }

  function pauseSpeech() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.pause();
    setSpeech((current) => ({ ...current, status: "paused" }));
  }

  function resumeSpeech() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.resume();
    setSpeech((current) => ({ ...current, status: "playing" }));
  }

  function stopSpeech() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeech((current) => ({ ...current, id: null, status: "idle" }));
  }

  const privacyShieldActive = Boolean(
    viewerPage ||
      termsOpen ||
      accuracyTarget ||
      (libraryStep === 2 && selectedDocs.length > 0 && requestStep !== 1),
  );

  return (
    <div className={`${styles.hub} financials-page mems-information-hub-print-guard`}>
      <header className="financials-simple-header">
        <div className="wrap financials-hub-wrap">
          <div className={styles.introPanel}>
            <p className={styles.sectionEyebrow}>Millstadt Ambulance Service</p>
            <h1>{PUBLIC_FINANCIALS_PAGE_TITLE}</h1>
            <p>{PUBLIC_FINANCIALS_PAGE_SUBTITLE}</p>
            <span className={styles.previewNote}>
              Development preview - synthetic test documents only.
            </span>
          </div>
        </div>
      </header>

      <FinancialsPrivacyShield active={privacyShieldActive} />

      <div className="financials-workspace">
        <div className="wrap financials-hub-wrap financials-two-section-layout">
          {form990Catalog && (
            <DocumentLibrarySection
              step={libraryStep}
              catalog={form990Catalog}
              restrictedDocs={catalogDocs}
              selectedForm990Ids={selectedForm990Ids}
              selectedRestrictedIds={selectedDocIds}
              selectedForm990s={selectedForm990s}
              selectedRestrictedDocs={selectedDocs}
              errors={libraryStep === 1 ? errors : []}
              onToggleForm990={toggleForm990}
              onToggleRestricted={toggleDocument}
              onContinue={() => {
                if (!selectedForm990Ids.length && !selectedDocIds.length) {
                  setErrors(["Choose at least one document."]);
                  return;
                }
                setErrors([]);
                setLibraryStep(2);
                setRequestStep(selectedDocIds.length ? 2 : 1);
              }}
              onBack={() => {
                setErrors([]);
                setLibraryStep(1);
                setRequestStep(1);
              }}
              onReport={(target) => void openAccuracyReport(target)}
            />
          )}

          {libraryStep === 2 && selectedDocs.length > 0 && (
            <RequestAccessSection
              step={requestStep}
              docs={catalogDocs}
              selectedDocIds={selectedDocIds}
              selectedDocs={selectedDocs}
              form={form}
              errors={errors}
              requests={myRequests}
              docsById={docsById}
              submittedRequest={submittedRequest}
              refreshing={refreshing}
              onToggleDocument={toggleDocument}
              onFieldChange={updateForm}
              onContinue={() => setRequestStep(2)}
              onBack={() => {
                setErrors([]);
                setLibraryStep(1);
                setRequestStep(1);
              }}
              onOpenTerms={openTerms}
              onRefresh={refreshMyRequests}
              onOpenViewer={beginViewer}
              onStartAnother={startAnotherRequest}
              onReport={(target) => void openAccuracyReport(target)}
            />
          )}

          <DocumentInformationSection
            onOpenPublicNotice={() => setForm990NoticeOpen(true)}
            onOpenRestrictedNotice={() => setRestrictedNoticeOpen(true)}
            onOpenCountingNotice={() => setCountingNoticeOpen(true)}
            onOpenCorrectionsNotice={() => setCorrectionsNoticeOpen(true)}
            onReport={() =>
              void openAccuracyReport({
                id: "PAGE-FINANCIAL-INFORMATION",
                title: "Financial Information page",
                version: "Development preview",
                sourceUrl: "/financials-information-hub",
                pageOrSection: "Financial Information page",
              })
            }
          />
        </div>
      </div>

      {form990NoticeOpen && form990Catalog && (
        <AccessibleModal
          id="form-990-access-notice"
          title="About public Form 990 access"
          onClose={() => {
            setForm990NoticeOpen(false);
            stopSpeech();
          }}
          closeText="Close"
        >
          <ReadAloudControls
            id="form-990-notice"
            label="Read this notice aloud"
            text={[...form990Catalog.notice, ...form990Catalog.aiNotice].join("\n\n")}
            speech={speech}
            onRead={readText}
            onPause={pauseSpeech}
            onResume={resumeSpeech}
            onStop={stopSpeech}
            onRateChange={(rate) => setSpeech((current) => ({ ...current, rate }))}
          />
          <div className="financials-modal-copy">
            <NoticeText heading="Public access notice" paragraphs={form990Catalog.notice} />
            <NoticeText heading="AI-processing notice" paragraphs={form990Catalog.aiNotice} />
          </div>
        </AccessibleModal>
      )}

      {restrictedNoticeOpen && (
        <AccessibleModal
          id="restricted-document-notice"
          title="About restricted documents"
          onClose={() => {
            setRestrictedNoticeOpen(false);
            stopSpeech();
          }}
        >
          <ReadAloudControls
            id="restricted-document-notice-reader"
            label="Read this notice aloud"
            text={[
              "Additional financial documents are listed by title, reporting period, publication date, and version.",
              "Request access to a listed document. Approval is required before viewing.",
              ...ACCURATE_IDENTIFICATION_NOTICE,
            ].join("\n\n")}
            speech={speech}
            onRead={readText}
            onPause={pauseSpeech}
            onResume={resumeSpeech}
            onStop={stopSpeech}
            onRateChange={(rate) => setSpeech((current) => ({ ...current, rate }))}
          />
          <div className="financials-modal-copy">
            <NoticeText
              heading="Listed document access"
              paragraphs={[
                "Additional financial documents are listed by title, reporting period, publication date, and version.",
                "Request access to a listed document. Approval is required before viewing.",
              ]}
            />
            <NoticeText heading="Identifying information" paragraphs={ACCURATE_IDENTIFICATION_NOTICE} />
          </div>
        </AccessibleModal>
      )}

      {countingNoticeOpen && (
        <AccessibleModal
          id="financial-counting-notice"
          title="How financial figures are counted"
          onClose={() => {
            setCountingNoticeOpen(false);
            stopSpeech();
          }}
        >
          <ReadAloudControls
            id="financial-counting-reader"
            label="Read this notice aloud"
            text={RUN_COUNT_METHODOLOGY_NOTICE.join("\n\n")}
            speech={speech}
            onRead={readText}
            onPause={pauseSpeech}
            onResume={resumeSpeech}
            onStop={stopSpeech}
            onRateChange={(rate) => setSpeech((current) => ({ ...current, rate }))}
          />
          <NoticeText paragraphs={RUN_COUNT_METHODOLOGY_NOTICE} />
        </AccessibleModal>
      )}

      {correctionsNoticeOpen && (
        <AccessibleModal
          id="financial-corrections-notice"
          title="Corrections and document concerns"
          onClose={() => {
            setCorrectionsNoticeOpen(false);
            stopSpeech();
          }}
        >
          <NoticeText
            paragraphs={[
              "Reports may identify a specific concern about accuracy, attribution, completeness, or document integrity for private administrative review.",
              "Submitting a report does not establish that material is inaccurate and does not automatically remove, change, or republish a document.",
            ]}
          />
          <div className="financials-modal-actions">
            <button
              className="financials-secondary-button"
              type="button"
              onClick={() => {
                setCorrectionsNoticeOpen(false);
                void openAccuracyReport({
                  id: "PAGE-FINANCIAL-INFORMATION",
                  title: "Financial Information page",
                  version: "Development preview",
                  sourceUrl: "/financials-information-hub",
                  pageOrSection: "Financial Information page",
                });
              }}
            >
              Report an accuracy or document-integrity concern
            </button>
          </div>
        </AccessibleModal>
      )}

      {termsOpen && (
        <AccessibleModal
          id="restricted-document-terms"
          title="Review terms and submit"
          onClose={() => {
            setTermsOpen(false);
            setSignatureOpen(false);
            setAccepted(false);
            stopSpeech();
          }}
        >
          <p className="financials-sensitive-notice">{SENSITIVE_CAPTURE_NOTICE}</p>
          <TermsSections
            selectedDocs={selectedDocs}
            speech={speech}
            onRead={readText}
            onPause={pauseSpeech}
            onResume={resumeSpeech}
            onStop={stopSpeech}
            onRateChange={(rate) => setSpeech((current) => ({ ...current, rate }))}
          />

          {errors.length > 0 && <ErrorMessage errors={errors} />}

          <label className="financials-acceptance">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => {
                if (event.target.checked) requestSignature();
                else {
                  setAccepted(false);
                  setSignatureOpen(false);
                  setSignature(emptySignature(form.fullLegalName));
                }
              }}
            />
            <span>{ACCEPTED_CHECKBOX_TEXT}</span>
          </label>

          {signatureOpen && (
            <section className="financials-signature-panel" aria-labelledby="sign-request-title">
              <h3 id="sign-request-title">Sign this request</h3>
              <p>Your signature will be included in the agreement PDF sent with the request.</p>
              <FinancialsSignaturePad
                value={signature}
                legalName={form.fullLegalName}
                onChange={setSignature}
              />
              <div className="financials-step-actions">
                <button
                  className="financials-secondary-button"
                  type="button"
                  onClick={() => {
                    setSignatureOpen(false);
                    setSignature(emptySignature(form.fullLegalName));
                  }}
                >
                  Cancel
                </button>
                <button className="financials-primary-button" type="button" onClick={applySignature}>
                  Apply signature
                </button>
              </div>
            </section>
          )}

          {!signatureOpen && accepted && (
            <p className="financials-signature-confirmed" role="status">
              <CheckCircle2 aria-hidden="true" /> Signed by {form.fullLegalName}
            </p>
          )}

          <div className="financials-modal-actions">
            <button
              className="financials-primary-button"
              type="button"
              disabled={!accepted || submitting || !accessCsrfToken || !accessIdempotencyKey}
              onClick={submitAccessRequest}
            >
              {submitting
                ? "Submitting..."
                : !accessCsrfToken || !accessIdempotencyKey
                  ? "Preparing..."
                  : ACCEPTED_BUTTON_TEXT}
            </button>
          </div>
        </AccessibleModal>
      )}

      {viewerPage && (
        <ViewerDialog
          page={viewerPage}
          zoom={zoom}
          speech={speech}
          onClose={closeViewer}
          onZoomChange={setZoom}
          onPageChange={(pageNumber) => loadViewerPage(pageNumber)}
          onRead={readText}
          onPause={pauseSpeech}
          onResume={resumeSpeech}
          onStop={stopSpeech}
          onRateChange={(rate) => setSpeech((current) => ({ ...current, rate }))}
        />
      )}

      {accuracyTarget && (
        <AccuracyReportDialog
          target={accuracyTarget}
          form={accuracyForm}
          upload={accuracyUpload}
          certification={accuracyCertification}
          contactAcknowledgment={accuracyContactAcknowledgment}
          signature={accuracySignature}
          signatureOpen={accuracySignatureOpen}
          signed={accuracySigned}
          errors={accuracyErrors}
          submitting={accuracySubmitting}
          csrfReady={Boolean(accuracyCsrfToken && accuracyIdempotencyKey)}
          receipt={submittedAccuracyReport}
          speech={speech}
          onClose={closeAccuracyReport}
          onFieldChange={updateAccuracyForm}
          onUploadChange={setAccuracyUpload}
          onCertificationChange={(checked) => {
            setAccuracyCertification(checked);
            if (!checked) {
              setAccuracySigned(false);
              setAccuracySignatureOpen(false);
            } else if (accuracyContactAcknowledgment) {
              openAccuracySignature();
            }
          }}
          onContactAcknowledgmentChange={(checked) => {
            setAccuracyContactAcknowledgment(checked);
            if (!checked) {
              setAccuracySigned(false);
              setAccuracySignatureOpen(false);
            } else if (accuracyCertification) {
              openAccuracySignature();
            }
          }}
          onSignatureChange={setAccuracySignature}
          onOpenSignature={openAccuracySignature}
          onCancelSignature={() => {
            setAccuracySignatureOpen(false);
            setAccuracySignature(emptySignature(accuracyForm.reporterName));
          }}
          onApplySignature={applyAccuracySignature}
          onSubmit={submitAccuracyReport}
          onRead={readText}
          onPause={pauseSpeech}
          onResume={resumeSpeech}
          onStop={stopSpeech}
          onRateChange={(rate) => setSpeech((current) => ({ ...current, rate }))}
        />
      )}
    </div>
  );
}

function DocumentInformationSection({
  onOpenPublicNotice,
  onOpenRestrictedNotice,
  onOpenCountingNotice,
  onOpenCorrectionsNotice,
  onReport,
}: {
  onOpenPublicNotice: () => void;
  onOpenRestrictedNotice: () => void;
  onOpenCountingNotice: () => void;
  onOpenCorrectionsNotice: () => void;
  onReport: () => void;
}) {
  return (
    <section className="financials-section" aria-labelledby="document-information-heading">
      <div className="financials-section-heading">
        <div>
          <p className={styles.sectionEyebrow}>Reference and review</p>
          <h2 id="document-information-heading">Document information and corrections</h2>
          <p>Review access details, counting methods, and the correction process.</p>
        </div>
      </div>
      <div className={styles.informationControls}>
        <button className="financials-secondary-button" type="button" onClick={onOpenPublicNotice}>
          About public Form 990 access
        </button>
        <button className="financials-secondary-button" type="button" onClick={onOpenRestrictedNotice}>
          About restricted documents
        </button>
        <button className="financials-secondary-button" type="button" onClick={onOpenCountingNotice}>
          How financial figures are counted
        </button>
        <button className="financials-secondary-button" type="button" onClick={onOpenCorrectionsNotice}>
          Corrections and document concerns
        </button>
      </div>
      <div className={styles.transparencyPanel}>
        <div>
          <h3>Document transparency</h3>
          <p>
            Published documents are identified by their reporting period, publication date,
            document version, and source information. If you believe a document contains an
            accuracy, attribution, or document-integrity concern, you may submit a report for
            administrative review.
          </p>
        </div>
        <button className={styles.reportLink} type="button" onClick={onReport}>
          Report an accuracy or document-integrity concern
        </button>
      </div>
    </section>
  );
}

function AccuracyReportDialog({
  target,
  form,
  upload,
  certification,
  contactAcknowledgment,
  signature,
  signatureOpen,
  signed,
  errors,
  submitting,
  csrfReady,
  receipt,
  speech,
  onClose,
  onFieldChange,
  onUploadChange,
  onCertificationChange,
  onContactAcknowledgmentChange,
  onSignatureChange,
  onOpenSignature,
  onCancelSignature,
  onApplySignature,
  onSubmit,
  onRead,
  onPause,
  onResume,
  onStop,
  onRateChange,
}: {
  target: AccuracyTarget;
  form: AccuracyFormState;
  upload: File | null;
  certification: boolean;
  contactAcknowledgment: boolean;
  signature: FinancialsSignature;
  signatureOpen: boolean;
  signed: boolean;
  errors: string[];
  submitting: boolean;
  csrfReady: boolean;
  receipt: AccuracyReportReceipt | null;
  speech: SpeechState;
  onClose: () => void;
  onFieldChange: (field: keyof AccuracyFormState, value: string) => void;
  onUploadChange: (file: File | null) => void;
  onCertificationChange: (checked: boolean) => void;
  onContactAcknowledgmentChange: (checked: boolean) => void;
  onSignatureChange: (signature: FinancialsSignature) => void;
  onOpenSignature: () => void;
  onCancelSignature: () => void;
  onApplySignature: () => void;
  onSubmit: () => void;
  onRead: (id: string, text: string) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRateChange: (rate: number) => void;
}) {
  const ready = Boolean(
    form.reporterName.trim() &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.reporterEmail.trim()) &&
      form.category &&
      form.pageOrSection.trim() &&
      form.description.trim() &&
      certification &&
      contactAcknowledgment &&
      signed &&
      csrfReady,
  );

  return (
    <AccessibleModal
      id="accuracy-report-dialog"
      title="Report an Accuracy or Document-Integrity Concern"
      onClose={onClose}
    >
      {receipt ? (
        <div className="financials-confirmation" role="status">
          <CheckCircle2 aria-hidden="true" />
          <div>
            <h3>Report received</h3>
            <p>{ACCURACY_REPORT_RESULT}</p>
            <p>Report reference: <code>{receipt.id}</code></p>
            <button className="financials-primary-button" type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="financials-sensitive-notice">{SENSITIVE_CAPTURE_NOTICE}</p>
          <ReadAloudControls
            id="accuracy-report-intro"
            label="Read this notice aloud"
            text={ACCURACY_REPORT_INTRO.join("\n\n")}
            speech={speech}
            onRead={onRead}
            onPause={onPause}
            onResume={onResume}
            onStop={onStop}
            onRateChange={onRateChange}
          />
          <NoticeText paragraphs={ACCURACY_REPORT_INTRO} />

          {errors.length > 0 && <ErrorMessage errors={errors} />}

          <div className={styles.reportGrid}>
            <label className="financials-field">
              <span>Document name</span>
              <input value={target.title} readOnly />
            </label>
            <label className="financials-field">
              <span>Document ID</span>
              <input value={target.id} readOnly />
            </label>
            <label className="financials-field">
              <span>Document version</span>
              <input value={target.version} readOnly />
            </label>
            <label className="financials-field">
              <span>Page URL</span>
              <input value={target.sourceUrl} readOnly />
            </label>
            <label className="financials-field">
              <span>Full name</span>
              <input
                autoComplete="name"
                value={form.reporterName}
                onChange={(event) => onFieldChange("reporterName", event.target.value)}
              />
            </label>
            <label className="financials-field">
              <span>Email address</span>
              <input
                type="email"
                autoComplete="email"
                value={form.reporterEmail}
                onChange={(event) => onFieldChange("reporterEmail", event.target.value)}
              />
            </label>
            <label className="financials-field">
              <span>Telephone number (optional)</span>
              <input
                type="tel"
                autoComplete="tel"
                value={form.reporterTelephone}
                onChange={(event) => onFieldChange("reporterTelephone", event.target.value)}
              />
            </label>
            <label className="financials-field">
              <span>What are you reporting?</span>
              <select
                value={form.category}
                onChange={(event) => onFieldChange("category", event.target.value)}
              >
                <option value="">Choose a category</option>
                {ACCURACY_REPORT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <p className={`financials-identification-note ${styles.reportFull}`}>
              {ACCURACY_IDENTITY_HELP}
            </p>
            <label className={`financials-field ${styles.reportFull}`}>
              <span>Page, section, statement, or location</span>
              <input
                value={form.pageOrSection}
                onChange={(event) => onFieldChange("pageOrSection", event.target.value)}
              />
            </label>
            <label className={`financials-field ${styles.reportFull}`}>
              <span>Describe the specific concern</span>
              <textarea
                value={form.description}
                onChange={(event) => onFieldChange("description", event.target.value)}
              />
            </label>
            <label className={`financials-field ${styles.reportFull}`}>
              <span>Supporting source or citation (optional)</span>
              <textarea
                value={form.supportingSource}
                onChange={(event) => onFieldChange("supportingSource", event.target.value)}
              />
            </label>
            <div className={styles.reportFull}>
              <div className={styles.uploadNotice}>
                {ACCURACY_UPLOAD_NOTICE.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              <label className="financials-field">
                <span><Upload aria-hidden="true" /> Upload supporting document (optional)</span>
                <input
                  type="file"
                  accept=".pdf,.docx,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg"
                  onChange={(event) => onUploadChange(event.target.files?.[0] ?? null)}
                />
                <small className={styles.fileSummary}>
                  {upload
                    ? `${upload.name} - ${formatFileSize(upload.size)}`
                    : "PDF, DOCX, PNG, or JPG. Maximum 10 MB."}
                </small>
              </label>
            </div>
          </div>

          <details className="financials-disclosure" open>
            <summary>Good-faith certification</summary>
            <ReadAloudControls
              id="accuracy-certification"
              label="Read this section aloud"
              text={[...ACCURACY_CERTIFICATION, ACCURACY_CONTACT_ACKNOWLEDGMENT].join("\n\n")}
              speech={speech}
              onRead={onRead}
              onPause={onPause}
              onResume={onResume}
              onStop={onStop}
              onRateChange={onRateChange}
            />
            <label className="financials-acceptance">
              <input
                type="checkbox"
                checked={certification}
                onChange={(event) => onCertificationChange(event.target.checked)}
              />
              <span>{ACCURACY_CERTIFICATION.join("\n\n")}</span>
            </label>
            <label className="financials-acceptance">
              <input
                type="checkbox"
                checked={contactAcknowledgment}
                onChange={(event) => onContactAcknowledgmentChange(event.target.checked)}
              />
              <span>{ACCURACY_CONTACT_ACKNOWLEDGMENT}</span>
            </label>
            <details className="financials-disclosure">
              <summary>Privacy notice</summary>
              <NoticeText paragraphs={ACCURACY_PRIVACY_NOTICE} />
            </details>
          </details>

          {signatureOpen && (
            <section className="financials-signature-panel" aria-labelledby="sign-report-title">
              <h3 id="sign-report-title">Sign this report</h3>
              <p>Your signature will be included in the report PDF sent for administrative review.</p>
              <FinancialsSignaturePad
                value={signature}
                legalName={form.reporterName}
                contextLabel="report"
                onChange={onSignatureChange}
              />
              <div className="financials-step-actions">
                <button className="financials-secondary-button" type="button" onClick={onCancelSignature}>
                  Cancel
                </button>
                <button className="financials-primary-button" type="button" onClick={onApplySignature}>
                  Apply signature
                </button>
              </div>
            </section>
          )}

          {!signatureOpen && certification && contactAcknowledgment && !signed && (
            <button className="financials-secondary-button" type="button" onClick={onOpenSignature}>
              <ShieldCheck aria-hidden="true" /> Sign report
            </button>
          )}

          {!signatureOpen && signed && (
            <p className="financials-signature-confirmed" role="status">
              <CheckCircle2 aria-hidden="true" /> Signed by {form.reporterName}
            </p>
          )}

          <div className="financials-modal-actions">
            <button className="financials-secondary-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="financials-primary-button"
              type="button"
              disabled={!ready || submitting}
              onClick={onSubmit}
            >
              {submitting ? "Submitting..." : csrfReady ? "Submit report" : "Preparing..."}
            </button>
          </div>
        </>
      )}
    </AccessibleModal>
  );
}

function DocumentLibrarySection({
  step,
  catalog,
  restrictedDocs,
  selectedForm990Ids,
  selectedRestrictedIds,
  selectedForm990s,
  selectedRestrictedDocs,
  errors,
  onToggleForm990,
  onToggleRestricted,
  onContinue,
  onBack,
  onReport,
}: {
  step: LibraryStep;
  catalog: Form990CatalogState;
  restrictedDocs: CatalogDocument[];
  selectedForm990Ids: string[];
  selectedRestrictedIds: string[];
  selectedForm990s: PublicForm990CatalogItem[];
  selectedRestrictedDocs: CatalogDocument[];
  errors: string[];
  onToggleForm990: (documentId: string) => void;
  onToggleRestricted: (documentId: string) => void;
  onContinue: () => void;
  onBack: () => void;
  onReport: (target: AccuracyTarget) => void;
}) {
  const selectedCount = selectedForm990Ids.length + selectedRestrictedIds.length;
  return (
    <section className="financials-section" aria-labelledby="document-library-heading">
      <div className="financials-section-heading">
        <div>
          <p className={styles.sectionEyebrow}>Document library</p>
          <h2 id="document-library-heading">
            {step === 1 ? "Choose documents" : "Your document selection"}
          </h2>
          <p>
            {step === 1
              ? "Select one or more records, then continue. Public filings open immediately; additional documents require review."
              : "Public filings are ready below. Complete the access request only for selections marked Request access."}
          </p>
        </div>
        <div className={styles.stepIndicator} aria-label={`Step ${step} of 2`}>
          <span className={styles.stepActive}>1</span>
          <i />
          <span className={step === 2 ? styles.stepActive : ""}>2</span>
        </div>
      </div>

      {step === 2 && selectedRestrictedIds.length > 0 && (
        <p className="financials-sensitive-notice">{SENSITIVE_CAPTURE_NOTICE}</p>
      )}

      {errors.length > 0 && <ErrorMessage errors={errors} />}

      {step === 1 ? (
        <>
          <details className={styles.documentPicker} open>
            <summary>
              <span>
                <FileText aria-hidden="true" />
                <strong>Documents</strong>
              </span>
              <small>{selectedCount ? `${selectedCount} selected` : "Choose documents"}</small>
            </summary>
            <div className={styles.pickerBody}>
              <div className={styles.pickerGroup}>
                <div className={styles.pickerGroupHeading}>
                  <span>Public Form 990 filings</span>
                  <small>No identification or approval required</small>
                </div>
                {catalog.documents.map((doc) => (
                  <label key={doc.id} className={styles.pickerRow}>
                    <input
                      type="checkbox"
                      checked={selectedForm990Ids.includes(doc.id)}
                      onChange={() => onToggleForm990(doc.id)}
                    />
                    <span className={styles.pickerDocument}>
                      <strong>Form 990 - tax year {doc.taxYear}</strong>
                      <small>{doc.title} | Filed {doc.filingDate} | {doc.pageCount} pages</small>
                    </span>
                    <span className={styles.badge}>Public</span>
                  </label>
                ))}
              </div>
              <div className={styles.pickerGroup}>
                <div className={styles.pickerGroupHeading}>
                  <span>Additional financial documents</span>
                  <small>Administrative review required</small>
                </div>
                {restrictedDocs.map((doc) => (
                  <label key={doc.id} className={styles.pickerRow}>
                    <input
                      type="checkbox"
                      checked={selectedRestrictedIds.includes(doc.id)}
                      onChange={() => onToggleRestricted(doc.id)}
                    />
                    <span className={styles.pickerDocument}>
                      <strong>{doc.title}</strong>
                      <small>{doc.category} | {doc.publicationDate} | {doc.pageCount} pages</small>
                    </span>
                    <span className={`${styles.badge} ${styles.badgeRequest}`}>Request access</span>
                  </label>
                ))}
              </div>
            </div>
          </details>
          <div className={styles.selectionBar}>
            <p>
              {selectedCount
                ? `${selectedCount} document${selectedCount === 1 ? "" : "s"} selected`
                : "Nothing selected yet"}
            </p>
            <button
              className="financials-primary-button"
              type="button"
              disabled={!selectedCount}
              onClick={onContinue}
            >
              Continue
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </>
      ) : (
        <div className={styles.selectionResults}>
          {selectedForm990s.length > 0 && (
            <div className={styles.resultGroup}>
              <div className={styles.resultGroupHeading}>
                <div>
                  <span className={styles.badge}>Public filings</span>
                  <h3>Ready to view</h3>
                </div>
                <span>{selectedForm990s.length} selected</span>
              </div>
              {selectedForm990s.map((doc) => (
                <article key={doc.id} className={styles.documentResultRow}>
                  <div className={styles.resultIdentity}>
                    <span className={styles.yearMark}>{doc.taxYear}</span>
                    <div>
                      <h4>{doc.title}</h4>
                      <p>Filed {doc.filingDate} | Version {doc.version} | {doc.pageCount} pages</p>
                    </div>
                  </div>
                  <div className="financials-form990-actions">
                    <a className="financials-primary-button" href={`/api/financials/form-990/${doc.id}/html`} target="_blank" rel="noreferrer">
                      <FileText aria-hidden="true" /> View
                    </a>
                    <a className="financials-secondary-button" href={`/api/financials/form-990/${doc.id}/pdf?download=1`}>
                      <Download aria-hidden="true" /> Download PDF
                    </a>
                    <a className="financials-secondary-button" href={`/api/financials/form-990/${doc.id}/html?print=1`} target="_blank" rel="noreferrer">
                      <Printer aria-hidden="true" /> Print
                    </a>
                    <a className="financials-text-link" href={`/api/financials/form-990/${doc.id}/html`} target="_blank" rel="noreferrer">
                      Accessible alternative
                    </a>
                  </div>
                  <button
                    className={styles.reportLink}
                    type="button"
                    onClick={() => onReport({
                      id: doc.id,
                      title: doc.title,
                      version: doc.version,
                      sourceUrl: `/api/financials/form-990/${doc.id}/html`,
                      pageOrSection: "Whole filing",
                    })}
                  >
                    Report an accuracy or document-integrity concern
                  </button>
                </article>
              ))}
            </div>
          )}

          {selectedRestrictedDocs.length > 0 && (
            <div className={`${styles.resultGroup} ${styles.resultGroupRestricted}`}>
              <div className={styles.resultGroupHeading}>
                <div>
                  <span className={`${styles.badge} ${styles.badgeRequest}`}>Request access</span>
                  <h3>Administrative review required</h3>
                </div>
                <span>{selectedRestrictedDocs.length} selected</span>
              </div>
              <ul className={styles.restrictedSelectionList}>
                {selectedRestrictedDocs.map((doc) => (
                  <li key={doc.id}>
                    <span><strong>{doc.title}</strong><small>{doc.category} | Version {doc.version}</small></span>
                    <button
                      className={styles.reportLink}
                      type="button"
                      onClick={() => onReport({
                        id: doc.id,
                        title: doc.title,
                        version: doc.version,
                        sourceUrl: "/financials-information-hub",
                        pageOrSection: "Catalog listing or released document",
                      })}
                    >
                      Report a concern
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={styles.resultActions}>
            <button className="financials-secondary-button" type="button" onClick={onBack}>
              <ChevronLeft aria-hidden="true" /> Change selection
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function RequestAccessSection({
  step,
  docs,
  selectedDocIds,
  selectedDocs,
  form,
  errors,
  requests,
  docsById,
  submittedRequest,
  refreshing,
  onToggleDocument,
  onFieldChange,
  onContinue,
  onBack,
  onOpenTerms,
  onRefresh,
  onOpenViewer,
  onStartAnother,
  onReport,
}: {
  step: RequestStep;
  docs: CatalogDocument[];
  selectedDocIds: string[];
  selectedDocs: CatalogDocument[];
  form: FormState;
  errors: string[];
  requests: AccessRequestRecord[];
  docsById: Map<string, CatalogDocument>;
  submittedRequest: AccessRequestRecord | null;
  refreshing: boolean;
  onToggleDocument: (documentId: string) => void;
  onFieldChange: (field: keyof FormState, value: string) => void;
  onContinue: () => void;
  onBack: () => void;
  onOpenTerms: () => void;
  onRefresh: () => void;
  onOpenViewer: (request: AccessRequestRecord, doc: CatalogDocument) => void;
  onStartAnother: () => void;
  onReport: (target: AccuracyTarget) => void;
}) {
  return (
    <section className="financials-section" aria-labelledby="request-access-heading">
      <div className="financials-section-heading">
        <div>
          <p className={styles.sectionEyebrow}>Administrative review</p>
          <h2 id="request-access-heading">Additional financial documents</h2>
          <p>Request access to a listed document. Approval is required before viewing.</p>
        </div>
      </div>

      {errors.length > 0 && <ErrorMessage errors={errors} />}

      {step === 1 && (
        <div className="financials-request-step">
          <div className="financials-catalog-grid">
            {docs.map((doc) => {
              const selected = selectedDocIds.includes(doc.id);
              return (
                <article
                  key={doc.id}
                  className={`financials-doc-card ${styles.restrictedCard}`}
                  aria-label={`${doc.title}${selected ? ", selected" : ""}`}
                >
                  <div className={styles.documentTopline}>
                    <span className={`${styles.badge} ${styles.badgeRequest}`}>Request access</span>
                    {selected && <BadgeCheck aria-label="Selected" />}
                  </div>
                  <div>
                    <h3>{doc.title}</h3>
                    <p>{doc.category}</p>
                  </div>
                  <dl className={styles.documentMeta}>
                    <div><dt>Reporting period</dt><dd>{doc.publicationDate.slice(0, 4)}</dd></div>
                    <div><dt>Published</dt><dd>{doc.publicationDate}</dd></div>
                    <div><dt>Version</dt><dd>{doc.version}</dd></div>
                    <div><dt>Length</dt><dd>{doc.pageCount} pages</dd></div>
                  </dl>
                  <div className={styles.restrictedCardActions}>
                    <button
                      className={selected ? "financials-secondary-button" : "financials-primary-button"}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onToggleDocument(doc.id)}
                    >
                      {selected ? "Selected" : "Request access"}
                    </button>
                    <button
                      className={styles.reportLink}
                      type="button"
                      onClick={() =>
                        onReport({
                          id: doc.id,
                          title: doc.title,
                          version: doc.version,
                          sourceUrl: "/financials-information-hub",
                          pageOrSection: "Catalog listing or released document",
                        })
                      }
                    >
                      Report a concern
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <div className={styles.selectionBar}>
            <p>
              {selectedDocIds.length
                ? `${selectedDocIds.length} document${selectedDocIds.length === 1 ? "" : "s"} selected`
                : "Select one or more documents to continue."}
            </p>
            <button
              className="financials-primary-button"
              type="button"
              disabled={!selectedDocIds.length}
              onClick={onContinue}
            >
              Continue with selected documents
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="financials-request-step">
          <h3>Your information</h3>
          <SelectedDocuments docs={selectedDocs} />
          <div className="financials-form-grid">
            <Field
              label="Full name"
              autoComplete="name"
              value={form.fullLegalName}
              onChange={(value) => onFieldChange("fullLegalName", value)}
            />
            <Field
              label="Email address"
              type="email"
              autoComplete="email"
              value={form.verifiedEmail}
              onChange={(value) => onFieldChange("verifiedEmail", value)}
            />
            <Field
              label="Mailing address"
              className="financials-field--full"
              autoComplete="street-address"
              value={form.mailingAddress}
              onChange={(value) => onFieldChange("mailingAddress", value)}
            />
            <Field
              label="City"
              autoComplete="address-level2"
              value={form.city}
              onChange={(value) => onFieldChange("city", value)}
            />
            <Field
              label="State"
              autoComplete="address-level1"
              value={form.state}
              onChange={(value) => onFieldChange("state", value)}
            />
            <Field
              label="ZIP code"
              autoComplete="postal-code"
              value={form.postalCode}
              onChange={(value) => onFieldChange("postalCode", value)}
            />
          </div>
          <p className="financials-identification-note">{ACCURATE_IDENTIFICATION_NOTICE[0]}</p>
          <div className="financials-step-actions">
            <button className="financials-secondary-button" type="button" onClick={onBack}>
              Back
            </button>
            <button className="financials-primary-button" type="button" onClick={onOpenTerms}>
              Review terms and submit
            </button>
          </div>
        </div>
      )}

      {step === 3 && submittedRequest && (
        <div className="financials-confirmation">
          <CheckCircle2 aria-hidden="true" />
          <div>
            <h3>Request submitted</h3>
            <p>
              The signed request was sent for administrative review. Restricted documents remain
              unavailable unless and until access is approved.
            </p>
            <p>Request ID: <code>{submittedRequest.id}</code></p>
            <button className="financials-secondary-button" type="button" onClick={onStartAnother}>
              Submit another request
            </button>
          </div>
        </div>
      )}

      {requests.length > 0 && (
        <RequestStatusList
          requests={requests}
          docsById={docsById}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onOpenViewer={onOpenViewer}
        />
      )}
    </section>
  );
}

function RequestStatusList({
  requests,
  docsById,
  refreshing,
  onRefresh,
  onOpenViewer,
}: {
  requests: AccessRequestRecord[];
  docsById: Map<string, CatalogDocument>;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenViewer: (request: AccessRequestRecord, doc: CatalogDocument) => void;
}) {
  return (
    <div className="financials-request-status">
      <div className="financials-request-status__heading">
        <h3>Request status</h3>
        <button className="financials-secondary-button" type="button" onClick={onRefresh}>
          <RefreshCw aria-hidden="true" />
          {refreshing ? "Refreshing..." : "Refresh status"}
        </button>
      </div>
      <div className="financials-status-stack">
        {requests.map((request) => (
          <article key={request.id} className="financials-status-message">
            <div className="financials-status-message__top">
              <div>
                <h4>{request.id}</h4>
                <p>{statusDescriptions[request.status]}</p>
              </div>
              <StatusBadge status={request.status} />
            </div>
            {request.approvedDocIds.map((documentId) => {
              const doc = docsById.get(documentId);
              if (!doc) return null;
              return (
                <div key={documentId} className="financials-approved-row">
                  <div>
                    <strong>{doc.title}</strong>
                    <span>Approved through {request.expirationAtUtc ?? "the approval period shown"}</span>
                  </div>
                  <button
                    className="financials-primary-button"
                    type="button"
                    onClick={() => onOpenViewer(request, doc)}
                  >
                    Open viewer
                  </button>
                </div>
              );
            })}
          </article>
        ))}
      </div>
    </div>
  );
}

function TermsSections({
  selectedDocs,
  speech,
  onRead,
  onPause,
  onResume,
  onStop,
  onRateChange,
}: {
  selectedDocs: CatalogDocument[];
  speech: SpeechState;
  onRead: (id: string, text: string) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRateChange: (rate: number) => void;
}) {
  const includesCallVolume = selectedDocs.some(
    (doc) => doc.id === "CALL-VOLUME-REQUESTS-2022-2026",
  );
  const sections: Array<{ id: string; title: string; groups: NoticeGroup[] }> = [
    {
      id: "accurate-information",
      title: "Accurate information requirement",
      groups: [
        { paragraphs: ACCURATE_IDENTIFICATION_NOTICE },
        { heading: "Privacy notice", paragraphs: PRIVACY_NOTICE },
      ],
    },
    {
      id: "release-provenance",
      title: "Release and provenance terms",
      groups: [
        { paragraphs: PROMINENT_LEGAL_NOTICE },
        { heading: "Release terms", paragraphs: RELEASE_TERMS },
        ...(includesCallVolume
          ? [{ heading: "Call-volume methodology notice", paragraphs: RUN_COUNT_METHODOLOGY_NOTICE }]
          : []),
      ],
    },
    {
      id: "ai-processing",
      title: "AI-processing notice",
      groups: [{ paragraphs: AI_PROCESSING_NOTICE }],
    },
  ];

  return (
    <div className="financials-disclosure-stack">
      {sections.map((section) => (
        <NoticeDisclosure
          key={section.id}
          id={section.id}
          title={section.title}
          groups={section.groups}
          speech={speech}
          onRead={onRead}
          onPause={onPause}
          onResume={onResume}
          onStop={onStop}
          onRateChange={onRateChange}
        />
      ))}
    </div>
  );
}

function AccessibleModal({
  id,
  title,
  closeText = "Close",
  onClose,
  children,
}: {
  id: string;
  title: string;
  closeText?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("hidden"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, []);

  return (
    <div className="financials-modal-backdrop">
      <section
        ref={dialogRef}
        className="financials-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
      >
        <header className="financials-modal__bar">
          <h2 id={`${id}-title`}>{title}</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={closeText}>
            <X aria-hidden="true" />
            <span>{closeText}</span>
          </button>
        </header>
        <div className="financials-modal__body">{children}</div>
      </section>
    </div>
  );
}

function NoticeDisclosure({
  id,
  title,
  groups,
  speech,
  onRead,
  onPause,
  onResume,
  onStop,
  onRateChange,
}: {
  id: string;
  title: string;
  groups: NoticeGroup[];
  speech: SpeechState;
  onRead: (id: string, text: string) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRateChange: (rate: number) => void;
}) {
  const text = groups
    .flatMap((group) => [group.heading ?? "", ...group.paragraphs])
    .filter(Boolean)
    .join("\n\n");
  return (
    <details className="financials-disclosure">
      <summary>{title}</summary>
      <ReadAloudControls
        id={id}
        label="Read this section aloud"
        text={text}
        speech={speech}
        onRead={onRead}
        onPause={onPause}
        onResume={onResume}
        onStop={onStop}
        onRateChange={onRateChange}
      />
      <div className="financials-notice-text">
        {groups.map((group, index) => (
          <NoticeText
            key={`${group.heading ?? title}-${index}`}
            heading={group.heading}
            paragraphs={group.paragraphs}
          />
        ))}
      </div>
    </details>
  );
}

function NoticeText({ heading, paragraphs }: NoticeGroup) {
  return (
    <section>
      {heading && <h3>{heading}</h3>}
      {paragraphs.map((paragraph, index) =>
        heading && index === 0 && paragraph.length < 90 ? null :
        index === 0 && paragraph.length < 90 ? (
          <h4 key={paragraph}>{paragraph}</h4>
        ) : (
          <p key={paragraph}>{paragraph}</p>
        ),
      )}
    </section>
  );
}

function ReadAloudControls({
  id,
  label,
  text,
  speech,
  onRead,
  onPause,
  onResume,
  onStop,
  onRateChange,
}: {
  id: string;
  label: string;
  text: string;
  speech: SpeechState;
  onRead: (id: string, text: string) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRateChange: (rate: number) => void;
}) {
  const active = speech.id === id;
  return (
    <div className="financials-speech-controls" aria-label={label}>
      <button type="button" onClick={() => onRead(id, text)}>
        <Play aria-hidden="true" /> {label}
      </button>
      <button type="button" disabled={!active || speech.status !== "playing"} onClick={onPause}>
        <Pause aria-hidden="true" /> Pause
      </button>
      <button type="button" disabled={!active || speech.status !== "paused"} onClick={onResume}>
        <Volume2 aria-hidden="true" /> Resume
      </button>
      <button type="button" disabled={!active} onClick={onStop}>
        <Square aria-hidden="true" /> Stop
      </button>
      <button type="button" onClick={() => onRead(id, text)}>
        <RotateCcw aria-hidden="true" /> Restart
      </button>
      <label>
        Speech rate
        <input
          type="range"
          min="0.75"
          max="1.35"
          step="0.05"
          value={speech.rate}
          onChange={(event) => onRateChange(Number(event.target.value))}
        />
      </label>
      <span className="financials-speech-state" role="status">
        {active ? speech.status : "idle"}
      </span>
    </div>
  );
}

function ViewerDialog({
  page,
  zoom,
  speech,
  onClose,
  onZoomChange,
  onPageChange,
  onRead,
  onPause,
  onResume,
  onStop,
  onRateChange,
}: {
  page: ViewerPage;
  zoom: number;
  speech: SpeechState;
  onClose: () => void;
  onZoomChange: (zoom: number) => void;
  onPageChange: (pageNumber: number) => void;
  onRead: (id: string, text: string) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRateChange: (rate: number) => void;
}) {
  const readerId = `viewer-${page.session.id}-${page.pageNumber}`;
  return (
    <div className="financials-viewer-backdrop" role="dialog" aria-modal="true">
      <section className="financials-viewer">
        <div className="financials-viewer__toolbar">
          <div>
            <h2>Approved document</h2>
            <span>You are authorized to view only the document identified in your approval record.</span>
          </div>
          <div className="financials-viewer__actions">
            <button type="button" onClick={onClose}>
              <X aria-hidden="true" /> Close viewer
            </button>
            <label className="financials-page-select">
              <span>Page</span>
              <select value={page.pageNumber} onChange={(event) => onPageChange(Number(event.target.value))}>
                {Array.from({ length: page.document.pageCount }, (_, index) => index + 1).map(
                  (pageNumber) => (
                    <option key={pageNumber} value={pageNumber}>Page {pageNumber}</option>
                  ),
                )}
              </select>
            </label>
            <button
              type="button"
              disabled={page.pageNumber <= 1}
              onClick={() => onPageChange(page.pageNumber - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={page.pageNumber >= page.document.pageCount}
              onClick={() => onPageChange(page.pageNumber + 1)}
              aria-label="Next page"
            >
              <ChevronRight aria-hidden="true" />
            </button>
            <button type="button" onClick={() => onZoomChange(Math.max(0.7, zoom - 0.1))} aria-label="Zoom out">
              <ZoomOut aria-hidden="true" />
            </button>
            <button type="button" onClick={() => onZoomChange(Math.min(1.4, zoom + 0.1))} aria-label="Zoom in">
              <ZoomIn aria-hidden="true" />
            </button>
          </div>
        </div>
        <p className="financials-sensitive-notice">{SENSITIVE_CAPTURE_NOTICE}</p>
        <details className="financials-disclosure financials-viewer-details">
          <summary>Document details</summary>
          <p>{RESTRICTED_VIEWER_NOTICE}</p>
          <dl className="financials-admin-dl">
            <MetaRow label="Document" value={page.document.title} />
            <MetaRow label="Release" value={page.session.releaseId} />
            <MetaRow label="Version" value={page.document.version} />
            <MetaRow label="Hash" value={page.document.individualizedHash} />
          </dl>
        </details>
        <ReadAloudControls
          id={readerId}
          label="Read aloud"
          text={page.pageText}
          speech={speech}
          onRead={onRead}
          onPause={onPause}
          onResume={onResume}
          onStop={onStop}
          onRateChange={onRateChange}
        />
        <article className="financials-viewer-page" style={{ fontSize: `${zoom}rem` }}>
          <div className="financials-watermark" aria-hidden="true">
            {Array.from({ length: 10 }, (_, index) => <span key={index}>{page.watermark}</span>)}
          </div>
          <pre>{page.pageText}</pre>
          <footer>{page.footerText}</footer>
        </article>
      </section>
    </div>
  );
}

function SelectedDocuments({ docs }: { docs: CatalogDocument[] }) {
  return (
    <div className="financials-selected-docs">
      <strong>Selected document{docs.length === 1 ? "" : "s"}</strong>
      <ul>{docs.map((doc) => <li key={doc.id}>{doc.title}</li>)}</ul>
    </div>
  );
}

function Field({
  label,
  value,
  type = "text",
  className = "",
  autoComplete,
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  className?: string;
  autoComplete?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={`financials-field ${className}`.trim()}>
      <span>{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ErrorMessage({ errors }: { errors: string[] }) {
  return (
    <div className="financials-error" role="alert">
      <strong>Check the following</strong>
      <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function StatusBadge({ status }: { status: RequestStatus }) {
  return <span className={`financials-pill financials-pill--${status}`}>{statusLabels[status]}</span>;
}

function normalizeIdentity(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
