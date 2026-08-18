import fs from "node:fs/promises";
import path from "node:path";
import { buildIncidentPdf } from "@/lib/lounge/incident-pdf";
import { buildFormPdf } from "@/lib/lounge/forms/pdf";
import { getFormSpec } from "@/lib/lounge/forms/registry";
import type { FormInstance } from "@/lib/lounge/forms/db";
import { buildWriteUpPdf } from "@/lib/lounge/writeup-pdf";
import type { WriteUp } from "@/lib/lounge/writeups";
import { buildOnboardingPdf } from "@/lib/lounge/onboarding/pdf";
import type {
  ItemRow,
  OnboardingRecord,
  ProgressRow,
  SectionRow,
  SignatureRow,
} from "@/lib/lounge/onboarding/types";
import { buildAckMemorandumPdf } from "@/lib/lounge/ack-pdf";
import { buildTruckCheckPdf } from "@/lib/truckcheck/pdf";
import { buildPersonnelPacketPdf } from "@/lib/lounge/personnel-pdf";
import type { PersonnelAttachment, PersonnelRecord } from "@/lib/lounge/personnel";
import { buildOfficialMeetingMinutesPdf } from "@/lib/board/minutes-pdf";
import type { Meeting } from "@/lib/board/governance";
import {
  generateFullInventoryReport,
} from "@/lib/inventory/pdf";
import { buildOrderPdf } from "@/lib/inventory/orderPdf";
import { generateQrSheetPdf } from "@/lib/inventory/qr-pdf";
import type { InventoryCategory, InventoryItem } from "@/lib/inventory/db";
import { signedAgreementPdf } from "@/lib/financials-hub/agreement-pdf";
import { signedAccuracyReportPdf } from "@/lib/financials-hub/accuracy-report-pdf";
import type { AccuracyReportRecord } from "@/lib/financials-hub/accuracy-types";
import { form990PdfBuffer, SYNTHETIC_FORM_990S } from "@/lib/financials-hub/form990";
import type { AccessRequestRecord, SyntheticDocument } from "@/lib/financials-hub/types";

const outputDir = path.join(process.cwd(), "tmp", "pdfs");
const now = "2026-08-17T14:30:00.000Z";
const longName = "Alexandra Montgomery-Worthington-Santiago";
const longNarrative = Array.from(
  { length: 42 },
  (_, index) => `Fictional review paragraph ${index + 1}: This intentionally long narrative verifies wrapping, page transitions, and footer clearance without using any real employee, patient, applicant, or operational information.`,
).join(" ");

async function dataUri(relativePath: string, mime: string) {
  const bytes = await fs.readFile(path.join(process.cwd(), "public", relativePath));
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

async function main() {
const signature = await dataUri("images/millstadt-ems/logo.png", "image/png");

const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const value = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  if (value.startsWith("mock://")) {
    const relative = value.slice("mock://".length);
    const bytes = await fs.readFile(path.join(process.cwd(), "public", relative));
    const contentType = relative.endsWith(".png") ? "image/png" : "image/jpeg";
    return new Response(bytes, { status: 200, headers: { "Content-Type": contentType } });
  }
  return originalFetch(input, init);
}) as typeof globalThis.fetch;

async function write(name: string, bytes: Buffer) {
  await fs.writeFile(path.join(outputDir, name), bytes);
  process.stdout.write(`${name}\t${bytes.length}\n`);
}

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

await write("01-incident.pdf", await buildIncidentPdf({
  id: "11111111-1111-4111-8111-111111111111",
  createdBy: { name: longName },
  incidentDate: "2026-08-16",
  incidentTime: "23:45",
  city: "Fictional Test Location",
  specificLocation: "A deliberately long fictional location description used only for PDF layout verification",
  unitInvolved: "TEST-3926",
  summary: longNarrative,
  patientInvolved: "No patient information. Fictional sample only.",
  witnesses: "No real witnesses. " + longNarrative.slice(0, 900),
  actionsTaken: "No real action. " + longNarrative.slice(0, 1_200),
  involvedEmployees: [
    { id: "employee-1", name: longName },
    { id: "employee-2", name: "Jordan Fictional Reviewer" },
  ],
  photos: [
    { url: "mock://lounge/brand/hero-3926.jpg", name: "Landscape fictional attachment" },
    { url: "mock://images/millstadt-ems/logo.png", name: "Portrait and logo proportion check" },
  ],
  submittedAt: now,
}));

const formSpec = getFormSpec("annual_performance_evaluation");
if (!formSpec) throw new Error("Annual performance evaluation form spec is missing");
const formData: Record<string, unknown> = {};
for (const section of formSpec.sections) {
  for (const field of section.fields) {
    formData[field.key] = field.type === "longtext"
      ? longNarrative
      : field.type === "checkbox"
        ? true
        : field.type === "number"
          ? 4
          : field.type === "date"
            ? "2026-08-17"
            : `Fictional ${field.label}`;
  }
}
const form: FormInstance = {
  id: "22222222-2222-4222-8222-222222222222",
  formType: formSpec.id,
  employeeId: "employee-1",
  status: "finalized",
  data: formData,
  signatures: formSpec.signatures.map((item, index) => ({
    who: item.who,
    printedName: index === 0 ? longName : "Jordan Fictional Reviewer",
    signatureDataUrl: signature,
    role: index === 0 ? "Fictional employee title with a deliberately long description" : "Fictional evaluator",
    signedAt: now,
  })),
  refusedToSign: [],
  share: { saveToFile: true, visibleToEmployee: true, emailEmployee: false, emailAdminInbox: false },
  assignmentId: null,
  pdfUrl: null,
  pdfFilename: null,
  personnelRecordId: null,
  emailedToEmployee: false,
  emailedToAdminInbox: false,
  emailedAt: null,
  finalizedAt: now,
  finalizedById: "employee-2",
  rescindedAt: null,
  rescindedById: null,
  rescindedReason: null,
  rescindedByName: null,
  correctedById: null,
  correctsId: null,
  createdById: "employee-2",
  createdAt: now,
  updatedAt: now,
};
await write("02-employee-form.pdf", await buildFormPdf({
  spec: formSpec,
  form,
  employee: { firstName: "Alexandra", lastName: "Montgomery-Worthington-Santiago", fullName: longName, position: "Fictional Advanced Provider and Training Coordinator", employeeId: "TEST-0001" },
}));

const writeUp: WriteUp = {
  id: "33333333-3333-4333-8333-333333333333",
  employeeId: "employee-1",
  status: "finalized",
  employeeFullName: longName,
  employeePosition: "Fictional Advanced Provider and Training Coordinator",
  employeeDepartment: "Fictional Operations / Test Shift / Test Station",
  supervisorId: "employee-2",
  supervisorName: "Jordan Fictional Reviewer",
  dateIssued: "2026-08-17",
  incidentDate: now,
  incidentLocation: "Fictional location used only for layout testing",
  correctiveActionType: "Written warning",
  issueCategory: "Documentation issue",
  factualDescription: longNarrative,
  policyViolated: longNarrative.slice(0, 1_600),
  evidenceReviewed: longNarrative.slice(0, 1_400),
  priorNoticeOfExpectation: longNarrative.slice(0, 900),
  priorRelatedDiscipline: "",
  operationalImpact: longNarrative.slice(0, 1_100),
  correctiveExpectations: longNarrative.slice(0, 1_500),
  actionPlan: longNarrative.slice(0, 1_300),
  improvementTimeline: "Fictional 30-day review period.",
  consequencesStatement: longNarrative.slice(0, 1_000),
  managerInternalNotes: "This internal note must not appear in the PDF.",
  responseStatus: "provided",
  employeeResponseText: longNarrative.slice(0, 2_000),
  managerSignature: { printedName: "Jordan Fictional Reviewer", signatureDataUrl: signature, role: "Fictional supervisor", signedAt: now },
  employeeSignature: { printedName: longName, signatureDataUrl: signature, role: "Fictional employee title with a deliberately long description", signedAt: now },
  employeeRefusedToSign: false,
  witnessSignature: { printedName: "Taylor Fictional Witness", signatureDataUrl: signature, role: "Fictional witness", signedAt: now },
  saveToFile: true,
  pdfUrl: null,
  pdfFilename: null,
  personnelRecordId: null,
  createdById: "employee-2",
  finalizedAt: now,
  finalizedById: "employee-2",
  createdAt: now,
  updatedAt: now,
};
await write("03-writeup.pdf", await buildWriteUpPdf({ writeUp, draft: false }));

const onboardingRecord: OnboardingRecord = {
  id: "44444444-4444-4444-8444-444444444444",
  employeeId: "employee-1",
  employeeName: longName,
  position: "Fictional Provider",
  startDate: "2026-08-17",
  employmentType: "part_time",
  credentialLevel: "paramedic",
  assignedUnit: "TEST-3926",
  preceptorId: "employee-2",
  preceptorName: "Jordan Fictional Reviewer",
  witnessId: "employee-3",
  witnessName: "Taylor Fictional Witness",
  status: "finalized",
  finalOutcome: "cleared_with_restrictions",
  finalNotes: longNarrative,
  pdfUrl: null,
  pdfFilename: null,
  personnelRecordId: null,
  finalizedAt: now,
  finalizedById: "employee-2",
  rescindedAt: null,
  rescindedById: null,
  rescindedReason: null,
  createdById: "employee-2",
  createdAt: now,
  updatedAt: now,
};
const onboardingSections: SectionRow[] = [
  { id: "section-1", title: "Identity and Credential Verification", displayOrder: 1, active: true },
  { id: "section-2", title: "Orientation and Operational Readiness", displayOrder: 2, active: true },
];
const onboardingItems: ItemRow[] = Array.from({ length: 18 }, (_, index) => ({
  id: `item-${index + 1}`,
  sectionId: index < 9 ? "section-1" : "section-2",
  label: `Fictional onboarding requirement ${index + 1} with a deliberately long label to verify wrapping`,
  required: index % 2 === 0,
  hasUpload: index % 3 === 0,
  hasExpiration: index % 4 === 0,
  hasNotes: true,
  hasVerification: true,
  shareSaveToFile: false,
  shareEmailEmployee: false,
  shareEmailAdmin: false,
  displayOrder: index + 1,
  active: true,
}));
const onboardingProgress: ProgressRow[] = onboardingItems.map((item, index) => ({
  id: `progress-${index + 1}`,
  recordId: onboardingRecord.id,
  itemId: item.id,
  status: index % 5 === 0 ? "completed_with_followup" : "completed",
  notes: index === 4 ? longNarrative.slice(0, 1_100) : `Fictional note ${index + 1}`,
  fileUrl: null,
  fileName: item.hasUpload ? `fictional-document-${index + 1}.pdf` : null,
  expirationDate: item.hasExpiration ? "2027-08-17" : null,
  completedById: "employee-2",
  completedByName: "Jordan Fictional Reviewer",
  completedAt: now,
}));
const onboardingSignatures: SignatureRow[] = (["employee", "preceptor", "witness"] as const).map((who, index) => ({
  id: `signature-${index + 1}`,
  recordId: onboardingRecord.id,
  who,
  printedName: index === 0 ? longName : `${who} fictional signer`,
  signatureDataUrl: signature,
  signedAt: now,
}));
await write("04-onboarding.pdf", await buildOnboardingPdf({
  record: onboardingRecord,
  sections: onboardingSections,
  items: onboardingItems,
  progress: onboardingProgress,
  signatures: onboardingSignatures,
}));

await write("05-acknowledgment.pdf", await buildAckMemorandumPdf({
  noticeId: "55555555-5555-4555-8555-555555555555",
  noticeTitle: "Fictional Notice With a Deliberately Long Subject for Layout Verification",
  noticeBody: longNarrative,
  noticeCreatedAt: now,
  employeeName: longName,
  employeeRank: "Fictional Advanced Provider and Training Coordinator",
  acknowledgedAt: now,
  signatureDataUrl: signature,
  signatureIp: "192.0.2.10",
}));

const truckItems = Array.from({ length: 54 }, (_, index) => ({
  category: `Fictional Category ${Math.floor(index / 9) + 1}`,
  label: `Fictional truck-check item ${index + 1} with a long equipment description`,
  status: index % 7 === 0 ? "Fail" : "Pass",
  numericValue: index % 6 === 0 ? 35 : null,
  unitOfMeasure: index % 6 === 0 ? "deg F" : null,
  amountAdded: index % 8 === 0 ? 2 : null,
  amountUnit: index % 8 === 0 ? "units" : null,
  comment: index % 5 === 0 ? longNarrative.slice(0, 340) : "Fictional check only.",
  isAbnormal: index % 7 === 0,
  checkedAt: now,
}));
await write("06-truck-check.pdf", await buildTruckCheckPdf({
  truckCheckId: "66666666-6666-4666-8666-666666666666",
  unit: "TEST-3926",
  unitDescription: "Fictional ambulance used only for report layout verification",
  submittedBy: longName,
  startedAt: "2026-08-17T13:00:00.000Z",
  submittedAt: now,
  durationSeconds: 5_400,
  pencilWhipFlag: "review",
  pencilWhipReasons: [{ code: "fictional", message: longNarrative.slice(0, 500), severity: "review" }],
  overallStatus: "Fictional review required",
  notes: longNarrative,
  categoryComments: { "Fictional Category 2": longNarrative.slice(0, 1_200) },
  refillRequest: longNarrative.slice(0, 1_500),
  items: truckItems,
  photos: [{ url: "https://example.invalid/fictional-photo.jpg", caption: "Fictional photo reference" }],
  signatureDataUrl: signature,
  additionalAttendants: [
    { name: "Jordan Fictional Reviewer", signatureDataUrl: signature },
    { name: "Taylor Fictional Witness", signatureDataUrl: signature },
  ],
}));

const personnelRecord: PersonnelRecord = {
  id: "record-1",
  employeeId: "employee-1",
  category: "performance",
  recordType: "Fictional Layout Test",
  title: "Fictional personnel record with an intentionally long title used to verify wrapping and page transitions",
  summary: longNarrative,
  actionTaken: longNarrative.slice(0, 2_600),
  severity: "moderate",
  status: "active",
  incidentDate: "2026-08-17",
  createdBy: "employee-2",
  supervisorId: "employee-2",
  witnesses: null,
  relatedUnit: "TEST-3926",
  relatedCall: null,
  followUpRequired: true,
  followUpDueDate: "2026-09-17",
  followUpCompletedAt: null,
  employeeVisible: true,
  restrictedVisibility: true,
  acknowledgmentRequired: true,
  acknowledgedAt: null,
  acknowledgedSignature: null,
  employeeResponse: longNarrative.slice(0, 2_300),
  relatedPolicy: null,
  locked: true,
  retentionCategory: "Fictional",
  archiveDate: null,
  accommodationType: null,
  accommodationStart: null,
  accommodationEnd: null,
  accommodationReview: null,
  workLimitations: longNarrative.slice(0, 1_700),
  approvedBy: null,
  adminNotes: longNarrative.slice(0, 1_900),
  createdAt: now,
  updatedAt: now,
};
const personnelAttachment: PersonnelAttachment = {
  id: "attachment-1",
  recordId: personnelRecord.id,
  employeeId: personnelRecord.employeeId,
  fileName: "fictional-supporting-document-with-a-long-filename.pdf",
  fileUrl: "private-blob:v1:fictional-reference-that-must-not-print",
  fileMime: "application/pdf",
  fileSize: 1234,
  documentCategory: "Fictional",
  visibilityLevel: "restricted_hr",
  adminNotes: null,
  employeeNotes: null,
  replacedById: null,
  uploadedBy: "employee-2",
  uploadedAt: now,
};
await write("07-personnel-packet.pdf", await buildPersonnelPacketPdf({
  employee: {
    id: "TEST-0001",
    firstName: "Alexandra",
    lastName: "Montgomery-Worthington-Santiago",
    certification: "Fictional Paramedic",
    position: "Fictional Advanced Provider and Training Coordinator",
    hireDate: "2026-01-01",
    photoUrl: null,
  },
  records: [personnelRecord],
  attachmentsByRecord: { [personnelRecord.id]: [personnelAttachment] },
  generatedBy: "Fictional Administrator With a Deliberately Long Display Name",
}));

const meeting: Meeting = {
  id: 999,
  board: "ems",
  type: "Regular",
  status: "Completed",
  title: "Fictional Board Meeting",
  date: "2026-08-17",
  startTime: "19:00",
  endTime: "22:30",
  location: "Fictional Community Room With a Deliberately Long Location Name",
  virtualLink: null,
  description: null,
  quorumOverride: null,
  minutesText: null,
  minutesPublic: false,
  minutesUpdatedBy: null,
  minutesUpdatedAt: null,
  minutesRawTranscript: null,
  minutesDraftText: null,
  minutesSignedBy: null,
  minutesSignedTitle: null,
  minutesSignedAt: null,
  minutesSignatureDataUrl: null,
  detailsConfirmed: true,
  isRecurring: false,
};
const minutes = Array.from({ length: 32 }, (_, index) =>
  `${index + 1}. FICTIONAL AGENDA ITEM ${index + 1}\n\n${longNarrative.slice(0, 760)}`,
).join("\n\n");
await write("08-board-minutes.pdf", await buildOfficialMeetingMinutesPdf({
  meeting,
  minutesText: minutes,
  secretaryName: longName,
  secretaryTitle: "Fictional Board Secretary and Records Coordinator",
  signedAt: now,
  signatureDataUrl: signature,
}));

const categories: InventoryCategory[] = [
  { id: "cat-1", name: "Fictional Airway Supplies", slug: "fictional-airway", sortOrder: 1, hasExpiry: true, inventoryType: "backstock" },
  { id: "cat-2", name: "Fictional Trauma Supplies", slug: "fictional-trauma", sortOrder: 2, hasExpiry: true, inventoryType: "backstock" },
];
const inventoryItems: InventoryItem[] = Array.from({ length: 64 }, (_, index) => {
  const category = categories[index % categories.length];
  return {
    id: `inventory-${index + 1}`,
    categoryId: category.id,
    categoryName: category.name,
    categorySlug: category.slug,
    name: `Fictional inventory item ${index + 1} with a deliberately long product name`,
    location: `Shelf ${index + 1} / fictional storage location with long detail`,
    par: 20,
    currentStock: 8 + (index % 7),
    priorStock: 10,
    expiredQty: index % 5 === 0 ? 2 : 0,
    qtyToOrder: 10,
    delta: index % 3 - 1,
    vendorSource: "Fictional vendor",
    notes: index % 4 === 0 ? longNarrative.slice(0, 260) : "Fictional note",
    skipOrder: false,
    sortOrder: index,
    version: 1,
    updatedAt: now,
  };
});
const order = await buildOrderPdf(inventoryItems, { submittedBy: longName, submittedDate: new Date(now), mode: "order" });
if (!order) throw new Error("Fictional inventory order unexpectedly contained no rows");
await write("09-inventory-order.pdf", order.buffer);
await write("10-inventory-full.pdf", await generateFullInventoryReport(inventoryItems, categories));
await write("11-inventory-qr.pdf", await generateQrSheetPdf(
  inventoryItems.slice(0, 32).map((item) => ({ itemName: item.name, location: item.location, url: `https://www.millstadtems.org/inventory/scan/fictional-${item.id}` })),
  "Fictional Layout Verification",
));

const selectedDocuments: SyntheticDocument[] = [{
  id: "FICTIONAL-DOCUMENT-1",
  title: "Fictional Restricted Document Used Only for PDF Layout Verification",
  filename: "fictional-document.pdf",
  category: "Financial report",
  version: "FICTIONAL-1",
  publicationDate: "2026-08-17",
  originalHash: "0".repeat(64),
  pages: ["Fictional page one", "Fictional page two"],
}];
const accessRequest: AccessRequestRecord = {
  id: "request-fictional-1",
  userId: "user-fictional-1",
  requestKind: "published_document_access",
  fullLegalName: longName,
  mailingAddress: "123 Fictional Layout Verification Boulevard",
  addressLine2: "Suite 456 With a Deliberately Long Secondary Address",
  city: "Millstadt",
  state: "IL",
  postalCode: "62260",
  verifiedEmail: "fictional@example.invalid",
  selectedDocIds: [selectedDocuments[0].id],
  selectedDocumentVersions: { [selectedDocuments[0].id]: selectedDocuments[0].version },
  requestedInformationDescription: longNarrative,
  approvedDocIds: [],
  status: "pending",
  submittedAtUtc: now,
  termsVersion: "FICTIONAL-TERMS-1",
  privacyVersion: "FICTIONAL-PRIVACY-1",
  acceptedCheckboxText: "Fictional acceptance text",
  acceptedButtonText: "Submit signed request",
  acceptedAtUtc: now,
  termsAcknowledged: true,
  signatureFullName: longName,
  signatureMethod: "drawn",
  signatureName: longName,
  signatureCapturedAtUtc: now,
  finalSubmissionConfirmationText: "Fictional final confirmation",
  finalSubmissionConfirmedAtUtc: now,
  agreementFilename: "fictional-access-agreement.pdf",
  signedCopyRequested: false,
  requestVersion: "FICTIONAL-1",
  releaseIds: [],
  flags: [],
};
await write("12-financial-access-agreement.pdf", signedAgreementPdf(accessRequest, selectedDocuments, {
  method: "drawn",
  dataUrl: signature,
  name: longName,
}));

const accuracyReport: AccuracyReportRecord = {
  id: "accuracy-fictional-1",
  documentId: selectedDocuments[0].id,
  documentTitle: selectedDocuments[0].title,
  documentVersion: selectedDocuments[0].version,
  sourceUrl: "https://example.invalid/fictional-source",
  pageOrSection: "Fictional page 999 with a deliberately long section description",
  category: "Possible factual inaccuracy",
  description: longNarrative,
  supportingSource: longNarrative.slice(0, 1_500),
  reporterName: longName,
  reporterEmail: "fictional@example.invalid",
  reporterTelephone: "555-0100",
  acknowledgmentVersion: "FICTIONAL-ACK-1",
  acknowledgmentTimestampUtc: now,
  submittedAtUtc: now,
  status: "Received",
  signatureMethod: "drawn",
  signatureName: longName,
  signatureCapturedAtUtc: now,
  agreementFilename: "fictional-accuracy-agreement.pdf",
  agreementHash: "0".repeat(64),
  reviewerNote: "",
  resolution: "",
  flags: [],
  activity: [],
};
await write("13-financial-accuracy-report.pdf", signedAccuracyReportPdf(accuracyReport, {
  method: "drawn",
  dataUrl: signature,
  name: longName,
}));

const form990 = SYNTHETIC_FORM_990S[0];
if (!form990) throw new Error("Synthetic Form 990 fixture is missing");
await write("14-public-form-990.pdf", form990PdfBuffer(form990));

process.stdout.write(`Generated 14 fictional PDF samples in ${outputDir}\n`);
}

main().catch((error) => {
  console.error("PDF registry render failed:", error);
  process.exitCode = 1;
});
