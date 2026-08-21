"use client";

import {
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
import { createPortal } from "react-dom";
import FinancialsSignaturePad, {
  type FinancialsSignature,
} from "./FinancialsSignaturePad";
import FinancialsPrivacyShield, {
  SENSITIVE_CAPTURE_NOTICE,
} from "./FinancialsPrivacyShield";
import styles from "./FinancialsArchivePrototype.module.css";
import {
  ACCURACY_CERTIFICATION,
  ACCURACY_REPORT_CATEGORIES,
  ACCURACY_REPORT_INTRO,
  ACCURACY_REPORT_RESULT,
  ACCURACY_UPLOAD_NOTICE,
  type AccuracyReportRecord,
} from "@/lib/financials-hub/accuracy-types";
import {
  ACCEPTED_BUTTON_TEXT,
  ACCEPTED_CHECKBOX_TEXT,
  FINAL_SUBMISSION_CONFIRMATION_TEXT,
  REQUEST_ADDITIONAL_TERMS_SECTIONS,
  REQUESTER_INFORMATION_NOTICE,
  REQUEST_TERMS_INTRO,
  REQUEST_TERMS_INTRO_PARAGRAPHS,
  REQUEST_TERMS_SECTIONS,
  REQUEST_TERMS_TEXT,
  RESTRICTED_REQUEST_INTRO,
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
  documents: PublicForm990CatalogItem[];
};

type SpeechState = {
  id: string | null;
  status: "idle" | "playing" | "paused";
  rate: number;
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

const preferredVoiceNames = [
  "samantha",
  "ava",
  "siri",
  "aria",
  "jenny",
  "zira",
  "allison",
  "victoria",
  "serena",
  "tessa",
  "moira",
  "fiona",
  "google us english",
];

const lowerPriorityVoiceNames = [
  "daniel",
  "alex",
  "fred",
  "tom",
  "arthur",
  "aaron",
  "ralph",
  "junior",
  "albert",
  "reed",
  "eddy",
  "evan",
];

function chooseNaturalEnglishVoice(voices: SpeechSynthesisVoice[]) {
  return [...voices]
    .filter((voice) => voice.lang.toLowerCase().startsWith("en"))
    .sort((left, right) => voiceScore(right) - voiceScore(left))[0] ?? null;
}

function voiceScore(voice: SpeechSynthesisVoice) {
  const name = voice.name.toLowerCase();
  let score = voice.lang.toLowerCase() === "en-us" ? 30 : 10;
  const preferredIndex = preferredVoiceNames.findIndex((candidate) => name.includes(candidate));
  if (preferredIndex >= 0) score += 200 - preferredIndex * 5;
  if (/natural|premium|enhanced|neural/.test(name)) score += 80;
  if (voice.localService) score += 8;
  if (lowerPriorityVoiceNames.some((candidate) => name.includes(candidate))) score -= 120;
  return score;
}

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
  const [termsAcknowledged, setTermsAcknowledged] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [signatureFullName, setSignatureFullName] = useState("");
  const [finalSubmissionConfirmed, setFinalSubmissionConfirmed] = useState(false);
  const [sendSignedCopy, setSendSignedCopy] = useState(false);
  const [signature, setSignature] = useState<FinancialsSignature>(emptySignature());
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
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
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

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

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const loadPreferredVoice = () => {
      preferredVoiceRef.current = chooseNaturalEnglishVoice(window.speechSynthesis.getVoices());
    };
    loadPreferredVoice();
    window.speechSynthesis.addEventListener("voiceschanged", loadPreferredVoice);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadPreferredVoice);
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
    setTermsAcknowledged(false);
    setAccepted(false);
    setSignatureFullName(form.fullLegalName);
    setFinalSubmissionConfirmed(false);
    setSendSignedCopy(false);
    setSignature(emptySignature(form.fullLegalName));
    setSignatureOpen(false);
    setTermsOpen(true);
    stopSpeech();
  }

  function requestSignature() {
    setAccepted(false);
    setFinalSubmissionConfirmed(false);
    setSignature(emptySignature(signatureFullName || form.fullLegalName));
    setSignatureOpen(true);
    setErrors([]);
  }

  function applySignature() {
    const valid =
      Boolean(signatureFullName.trim()) &&
      ((signature.method === "drawn" && Boolean(signature.dataUrl)) ||
      (signature.method === "typed" &&
        normalizeIdentity(signature.typedName) === normalizeIdentity(signatureFullName)));
    if (!valid) {
      setErrors([
        signature.method === "drawn"
          ? "Sign in the signature box before continuing."
          : "The typed signature must match the full name in the signature step.",
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
    if (!termsAcknowledged || !accepted || !finalSubmissionConfirmed) {
      setErrors(["The terms acknowledgment, electronic signature, and final confirmation are required."]);
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
          termsAcknowledged,
          signatureFullName,
          signatureMethod: signature.method,
          signatureDataUrl: signature.method === "drawn" ? signature.dataUrl : "",
          signatureTypedName: signature.method === "typed" ? signature.typedName : "",
          finalSubmissionConfirmed,
          finalSubmissionConfirmationText: FINAL_SUBMISSION_CONFIRMATION_TEXT,
          sendSignedCopyToRequester: sendSignedCopy,
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
      setTermsAcknowledged(false);
      setAccepted(false);
      setSignatureFullName("");
      setFinalSubmissionConfirmed(false);
      setSendSignedCopy(false);
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
    setTermsAcknowledged(false);
    setAccepted(false);
    setSignatureFullName("");
    setFinalSubmissionConfirmed(false);
    setSendSignedCopy(false);
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
    if (!accuracyCertification) {
      nextErrors.push("The good-faith acknowledgment is required.");
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
      body.set("certificationText", ACCURACY_CERTIFICATION.join("\n\n"));
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
    utterance.pitch = 1.03;
    utterance.lang = "en-US";
    const preferredVoice =
      preferredVoiceRef.current ?? chooseNaturalEnglishVoice(window.speechSynthesis.getVoices());
    if (preferredVoice) {
      preferredVoiceRef.current = preferredVoice;
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang;
    }
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
            <h1>Financial Transparency</h1>
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
              selectedDocs={selectedDocs}
              form={form}
              errors={errors}
              requests={myRequests}
              docsById={docsById}
              submittedRequest={submittedRequest}
              refreshing={refreshing}
              onFieldChange={updateForm}
              onBack={() => {
                setErrors([]);
                setLibraryStep(1);
                setRequestStep(1);
              }}
              onOpenTerms={openTerms}
              onRefresh={refreshMyRequests}
              onOpenViewer={beginViewer}
              onStartAnother={startAnotherRequest}
            />
          )}

        </div>
      </div>

      {termsOpen && (
        <AccessibleModal
          id="restricted-document-terms"
          title="Review request terms"
          onClose={() => {
            setTermsOpen(false);
            setSignatureOpen(false);
            setTermsAcknowledged(false);
            setAccepted(false);
            setSignatureFullName("");
            setFinalSubmissionConfirmed(false);
            setSendSignedCopy(false);
            stopSpeech();
          }}
        >
          <ReadAloudControls
            id="request-terms-reader"
            label="Read request terms aloud"
            text={REQUEST_TERMS_TEXT.join("\n\n")}
            speech={speech}
            onRead={readText}
            onPause={pauseSpeech}
            onResume={resumeSpeech}
            onStop={stopSpeech}
            onRateChange={(rate) => setSpeech((current) => ({ ...current, rate }))}
          />
          <RequestTermsContent />

          {errors.length > 0 && <ErrorMessage errors={errors} />}

          <label className="financials-acceptance">
            <input
              type="checkbox"
              checked={termsAcknowledged}
              onChange={(event) => {
                setTermsAcknowledged(event.target.checked);
                setFinalSubmissionConfirmed(false);
                if (event.target.checked) {
                  setSignatureFullName(form.fullLegalName);
                  setSignature(emptySignature(form.fullLegalName));
                  setSignatureOpen(true);
                  setAccepted(false);
                } else {
                  setAccepted(false);
                  setSignatureOpen(false);
                  setSignatureFullName("");
                  setSignature(emptySignature(form.fullLegalName));
                }
              }}
            />
            <span>{ACCEPTED_CHECKBOX_TEXT}</span>
          </label>

          {signatureOpen && (
            <section className="financials-signature-panel" aria-labelledby="sign-request-title">
              <h3 id="sign-request-title">Sign your request</h3>
              <Field
                label="Full name"
                value={signatureFullName}
                autoComplete="name"
                required
                onChange={(value) => {
                  setSignatureFullName(value);
                  setAccepted(false);
                  setFinalSubmissionConfirmed(false);
                  setSignature(emptySignature(value));
                }}
              />
              <FinancialsSignaturePad
                value={signature}
                legalName={signatureFullName}
                onChange={setSignature}
              />
              <div className="financials-step-actions">
                <button
                  className="financials-secondary-button"
                  type="button"
                  onClick={() => {
                    setSignatureOpen(false);
                    setSignature(emptySignature(signatureFullName));
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
              <CheckCircle2 aria-hidden="true" /> Signature entered for {signatureFullName}
            </p>
          )}

          {!signatureOpen && termsAcknowledged && !accepted && (
            <button className="financials-secondary-button" type="button" onClick={requestSignature}>
              <ShieldCheck aria-hidden="true" /> Sign request
            </button>
          )}

          {!signatureOpen && accepted && (
            <>
              <label className="financials-copy-choice">
                <input
                  type="checkbox"
                  checked={sendSignedCopy}
                  onChange={(event) => setSendSignedCopy(event.target.checked)}
                />
                <span>Email me a copy of my signed request PDF for my records.</span>
              </label>
              <label className="financials-acceptance">
                <input
                  type="checkbox"
                  checked={finalSubmissionConfirmed}
                  onChange={(event) => setFinalSubmissionConfirmed(event.target.checked)}
                />
                <span>{FINAL_SUBMISSION_CONFIRMATION_TEXT}</span>
              </label>
            </>
          )}

          <div className="financials-modal-actions">
            <button
              className="financials-primary-button"
              type="button"
              disabled={!termsAcknowledged || !accepted || !signatureFullName.trim() || !finalSubmissionConfirmed || submitting || !accessCsrfToken || !accessIdempotencyKey}
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
            } else {
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

function AccuracyReportDialog({
  target,
  form,
  upload,
  certification,
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
      signed &&
      csrfReady,
  );

  return (
    <AccessibleModal
      id="accuracy-report-dialog"
      title="Report an accuracy or document-integrity concern"
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
          <p>{ACCURACY_REPORT_INTRO[1]}</p>

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
                <h3>{ACCURACY_UPLOAD_NOTICE[0]}</h3>
                {ACCURACY_UPLOAD_NOTICE.slice(1).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
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
            <summary>Good-faith acknowledgment</summary>
            <ReadAloudControls
              id="accuracy-certification"
              label="Read this section aloud"
              text={ACCURACY_CERTIFICATION.join("\n\n")}
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

          {!signatureOpen && certification && !signed && (
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
          <h2 id="document-library-heading">
            {step === 1 ? "Select documents" : "Selected documents"}
          </h2>
        </div>
        <div className={styles.stepIndicator} aria-label={`Step ${step} of 2`}>
          <span className={styles.stepActive}>1</span>
          <i />
          <span className={step === 2 ? styles.stepActive : ""}>2</span>
        </div>
      </div>

      {errors.length > 0 && <ErrorMessage errors={errors} />}

      {step === 1 ? (
        <>
          <div className={styles.pickerStack}>
            <details className={styles.documentPicker}>
              <summary>
                <span>
                  <ChevronRight className={styles.pickerChevron} aria-hidden="true" />
                  <strong>Public Form 990 filings</strong>
                </span>
                <small>
                  {selectedForm990Ids.length
                    ? `${selectedForm990Ids.length} selected`
                    : `${catalog.documents.length} available`}
                </small>
              </summary>
              <div className={styles.pickerBody}>
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
                  </label>
                ))}
              </div>
            </details>

            <details className={styles.documentPicker}>
              <summary>
                <span>
                  <ChevronRight className={styles.pickerChevron} aria-hidden="true" />
                  <strong>Additional financial documents</strong>
                </span>
                <small>
                  {selectedRestrictedIds.length
                    ? `${selectedRestrictedIds.length} selected`
                    : `${restrictedDocs.length} available`}
                </small>
              </summary>
              <div className={styles.pickerBody}>
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
                  </label>
                ))}
              </div>
            </details>
          </div>
          <div className={styles.selectionBar}>
            <p>
              {selectedCount
                ? `${selectedCount} document${selectedCount === 1 ? "" : "s"} selected`
                : "Select one or more documents"}
            </p>
            <button
              className="financials-primary-button"
              type="button"
              disabled={!selectedCount}
              onClick={onContinue}
            >
              {!selectedCount || selectedRestrictedIds.length ? "Request access" : "View selected"}
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
                  <h3>Public filings</h3>
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
                    <a
                      className="financials-primary-button"
                      href={`/api/financials/form-990/${doc.id}/html`}
                      target="_blank"
                      rel="noreferrer"
                      data-analytics-event="document_view"
                      data-analytics-document-kind="public_form_990"
                      data-analytics-document-id={doc.id}
                    >
                      <FileText aria-hidden="true" /> View
                    </a>
                    <a
                      className="financials-secondary-button"
                      href={`/api/financials/form-990/${doc.id}/pdf?download=1`}
                      data-analytics-event="document_download"
                      data-analytics-document-kind="public_form_990"
                      data-analytics-document-id={doc.id}
                    >
                      <Download aria-hidden="true" /> Download PDF
                    </a>
                    <a
                      className="financials-secondary-button"
                      href={`/api/financials/form-990/${doc.id}/html?print=1`}
                      target="_blank"
                      rel="noreferrer"
                      data-analytics-event="print_selection"
                      data-analytics-document-kind="public_form_990"
                      data-analytics-document-id={doc.id}
                    >
                      <Printer aria-hidden="true" /> Print
                    </a>
                    <a
                      className="financials-text-link"
                      href={`/api/financials/form-990/${doc.id}/html`}
                      target="_blank"
                      rel="noreferrer"
                      data-analytics-event="accessible_alternative"
                      data-analytics-document-kind="public_form_990"
                      data-analytics-document-id={doc.id}
                    >
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
                  <h3>Restricted documents</h3>
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
  selectedDocs,
  form,
  errors,
  requests,
  docsById,
  submittedRequest,
  refreshing,
  onFieldChange,
  onBack,
  onOpenTerms,
  onRefresh,
  onOpenViewer,
  onStartAnother,
}: {
  step: RequestStep;
  selectedDocs: CatalogDocument[];
  form: FormState;
  errors: string[];
  requests: AccessRequestRecord[];
  docsById: Map<string, CatalogDocument>;
  submittedRequest: AccessRequestRecord | null;
  refreshing: boolean;
  onFieldChange: (field: keyof FormState, value: string) => void;
  onBack: () => void;
  onOpenTerms: () => void;
  onRefresh: () => void;
  onOpenViewer: (request: AccessRequestRecord, doc: CatalogDocument) => void;
  onStartAnother: () => void;
}) {
  return (
    <section className="financials-section" aria-labelledby="request-access-heading">
      <div className="financials-section-heading">
        <div>
          <p className={styles.sectionEyebrow}>Administrative review</p>
          <h2 id="request-access-heading">{RESTRICTED_REQUEST_INTRO[0]}</h2>
        </div>
      </div>

      {errors.length > 0 && <ErrorMessage errors={errors} />}

      {step === 2 && (
        <div className="financials-request-step">
          <h3>{REQUESTER_INFORMATION_NOTICE[0]}</h3>
          <SelectedDocuments docs={selectedDocs} />
          <div className="financials-form-grid">
            <Field
              label="Full name"
              required
              autoComplete="name"
              value={form.fullLegalName}
              onChange={(value) => onFieldChange("fullLegalName", value)}
            />
            <Field
              label="Email address"
              required
              type="email"
              autoComplete="email"
              value={form.verifiedEmail}
              onChange={(value) => onFieldChange("verifiedEmail", value)}
            />
            <Field
              label="Mailing address"
              required
              className="financials-field--full"
              autoComplete="street-address"
              value={form.mailingAddress}
              onChange={(value) => onFieldChange("mailingAddress", value)}
            />
            <Field
              label="City"
              required
              autoComplete="address-level2"
              value={form.city}
              onChange={(value) => onFieldChange("city", value)}
            />
            <Field
              label="State"
              required
              autoComplete="address-level1"
              value={form.state}
              onChange={(value) => onFieldChange("state", value)}
            />
            <Field
              label="ZIP code"
              required
              autoComplete="postal-code"
              value={form.postalCode}
              onChange={(value) => onFieldChange("postalCode", value)}
            />
          </div>
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
            <p>Your signed request was sent for administrative review.</p>
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
                    data-analytics-event="document_view"
                    data-analytics-document-kind="restricted_document"
                    data-analytics-document-id={doc.id}
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

function RequestTermsContent() {
  return (
    <div className="financials-modal-copy">
      <section>
        <h3>{REQUEST_TERMS_INTRO}</h3>
        {REQUEST_TERMS_INTRO_PARAGRAPHS.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </section>
      {REQUEST_TERMS_SECTIONS.map((section) => (
        <section key={section.heading}>
          <h3>{section.heading}</h3>
          {section.bullets && (
            <ul>
              {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
            </ul>
          )}
          {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </section>
      ))}
      <details className="financials-disclosure">
        <summary>Additional terms and limitations</summary>
        <div className="financials-disclosure-stack">
          {REQUEST_ADDITIONAL_TERMS_SECTIONS.map((section) => (
            <section key={section.heading}>
              <h3>{section.heading}</h3>
              {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>
          ))}
        </div>
      </details>
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

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className={`${styles.hub} ${styles.modalPortal}`}>
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
    </div>,
    document.body,
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
  documentKind,
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
  documentKind?: "public_form_990" | "restricted_document";
}) {
  const active = speech.id === id;
  return (
    <div className="financials-speech-controls" aria-label={label}>
      <button
        type="button"
        onClick={() => onRead(id, text)}
        data-analytics-event="read_aloud"
        data-analytics-control={documentKind ? "document_reader" : "notice_reader"}
        data-analytics-document-kind={documentKind}
      >
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
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className={`${styles.hub} ${styles.modalPortal}`}>
      <div className="financials-viewer-backdrop" role="dialog" aria-modal="true">
      <section className="financials-viewer">
        <div className="financials-viewer__toolbar">
          <div>
            <h2>Approved document</h2>
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
            <button
              type="button"
              onClick={() => onZoomChange(Math.max(0.7, zoom - 0.1))}
              aria-label="Zoom out"
              data-analytics-event="accessibility_control"
              data-analytics-control="document_zoom_out"
              data-analytics-document-kind="restricted_document"
            >
              <ZoomOut aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onZoomChange(Math.min(1.4, zoom + 0.1))}
              aria-label="Zoom in"
              data-analytics-event="accessibility_control"
              data-analytics-control="document_zoom_in"
              data-analytics-document-kind="restricted_document"
            >
              <ZoomIn aria-hidden="true" />
            </button>
          </div>
        </div>
        <p className="financials-sensitive-notice">{SENSITIVE_CAPTURE_NOTICE}</p>
        <details className="financials-disclosure financials-viewer-details">
          <summary>Document details</summary>
          <dl className="financials-admin-dl">
            <MetaRow label="Document" value={page.document.title} />
            <MetaRow label="Reporting period" value={page.document.publicationDate.slice(0, 4)} />
            <MetaRow label="Document version" value={page.document.version} />
            <MetaRow label="Release date" value={page.session.createdAtUtc} />
            <MetaRow label="Release ID" value={page.session.releaseId} />
            <MetaRow label="SHA-256" value={page.document.individualizedHash} />
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
          documentKind="restricted_document"
        />
        <article className="financials-viewer-page" style={{ fontSize: `${zoom}rem` }}>
          <div className="financials-watermark" aria-hidden="true">
            {Array.from({ length: 10 }, (_, index) => <span key={index}>{page.watermark}</span>)}
          </div>
          <pre>{page.pageText}</pre>
          <footer>
            {page.footerText.split("\n").map((line) => <span key={line}>{line}</span>)}
          </footer>
        </article>
      </section>
      </div>
    </div>,
    document.body,
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
  required = false,
  helperText,
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  className?: string;
  autoComplete?: string;
  required?: boolean;
  helperText?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={`financials-field ${className}`.trim()}>
      <span>{label}{required ? " (required)" : ""}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        required={required}
        aria-required={required}
        onChange={(event) => onChange(event.target.value)}
      />
      {helperText && <small>{helperText}</small>}
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
