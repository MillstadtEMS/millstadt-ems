import type {
  PersistedTruckCheckPayload,
  TruckCheckOutboxJob,
} from "@/lib/truckcheck/db";

type BuildTruckCheckPdf = typeof import("@/lib/truckcheck/pdf").buildTruckCheckPdf;
type SendTruckCheckEmail = typeof import("@/lib/truckcheck/email").sendTruckCheckEmail;

export type TruckCheckOutboxDependencies = {
  claim: (preferredTruckCheckId?: string) => Promise<TruckCheckOutboxJob | null>;
  complete: (jobId: string) => Promise<void>;
  fail: (jobId: string, message: string) => Promise<void>;
  load: (truckCheckId: string) => Promise<PersistedTruckCheckPayload>;
  writeLegacy: (truckCheckId: string, payload: PersistedTruckCheckPayload) => Promise<void>;
  buildPdf: BuildTruckCheckPdf;
  uploadPdf: (truckCheckId: string, pdfBytes: Buffer) => Promise<string>;
  savePdfReference: (truckCheckId: string, reference: string) => Promise<void>;
  sendEmail: SendTruckCheckEmail;
};

async function defaultDependencies(): Promise<TruckCheckOutboxDependencies> {
  const [blob, privateBlobs, database, email, pdf] = await Promise.all([
    import("@vercel/blob"),
    import("@/lib/lounge/private-blobs"),
    import("@/lib/truckcheck/db"),
    import("@/lib/truckcheck/email"),
    import("@/lib/truckcheck/pdf"),
  ]);

  return {
    claim: database.claimTruckCheckOutboxJob,
    complete: database.completeTruckCheckOutboxJob,
    fail: database.failTruckCheckOutboxJob,
    load: database.loadPersistedTruckCheck,
    writeLegacy: database.writeLegacyTruckCheck,
    buildPdf: pdf.buildTruckCheckPdf,
    uploadPdf: async (truckCheckId, pdfBytes) => {
      const uploaded = await blob.put(`truckcheck/pdf/${truckCheckId}.pdf`, pdfBytes, {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/pdf",
      });
      return privateBlobs.privateBlobReference(uploaded.pathname);
    },
    savePdfReference: database.saveTruckCheckPdfReference,
    sendEmail: email.sendTruckCheckEmail,
  };
}

export type TruckCheckOutboxAttempt = {
  jobId: string;
  jobType: TruckCheckOutboxJob["jobType"];
  outcome: "completed" | "failed";
};

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  return "TruckCheck outbox job failed";
}

async function runPdfAndEmail(
  truckCheckId: string,
  payload: PersistedTruckCheckPayload,
  dependencies: TruckCheckOutboxDependencies,
): Promise<void> {
  const form = payload.form;
  if (!form.startedAt || !form.submittedAt || form.durationSeconds === undefined) {
    throw new Error("Authoritative TruckCheck timing fields are missing");
  }

  const pdfBytes = await dependencies.buildPdf({
    truckCheckId,
    unit: payload.unit.number,
    unitDescription: payload.unit.description,
    submittedBy: payload.submitter.name,
    startedAt: form.startedAt,
    submittedAt: form.submittedAt,
    durationSeconds: form.durationSeconds,
    pencilWhipFlag: payload.pencilWhip.flag,
    pencilWhipReasons: payload.pencilWhip.reasons,
    overallStatus: payload.overallStatus,
    notes: form.notes,
    categoryComments: payload.categoryComments,
    refillRequest: payload.refillRequest,
    items: form.items,
    photos: payload.photos,
    signatureDataUrl: form.attendant1Signature || null,
    additionalAttendants: form.attendants.map((attendant) => ({
      name: attendant.name,
      signatureDataUrl: attendant.signature || null,
    })),
  });

  const pdfReference = await dependencies.uploadPdf(truckCheckId, pdfBytes);
  await dependencies.savePdfReference(truckCheckId, pdfReference);
  await dependencies.sendEmail({
    truckCheckId,
    unit: payload.unit.number,
    submittedBy: payload.submitter.name,
    partnerName: form.attendants.map((attendant) => attendant.name).join(", ") || null,
    durationSeconds: form.durationSeconds,
    pencilWhipFlag: payload.pencilWhip.flag,
    pencilWhipReasons: payload.pencilWhip.reasons,
    abnormalCount: payload.abnormalCount,
    failCount: payload.failCount,
    notes: form.notes,
    pdfBytes,
    photos: payload.photos,
  });
}

export async function processTruckCheckOutbox(
  preferredTruckCheckId?: string,
  dependencies?: TruckCheckOutboxDependencies,
  maximumJobs = 4,
): Promise<TruckCheckOutboxAttempt[]> {
  const resolvedDependencies = dependencies ?? await defaultDependencies();
  const attempts: TruckCheckOutboxAttempt[] = [];
  for (let index = 0; index < maximumJobs; index += 1) {
    const job = await resolvedDependencies.claim(preferredTruckCheckId);
    if (!job) break;

    try {
      const payload = await resolvedDependencies.load(job.truckCheckId);
      if (job.jobType === "legacy_copy") {
        await resolvedDependencies.writeLegacy(job.truckCheckId, payload);
      } else {
        await runPdfAndEmail(job.truckCheckId, payload, resolvedDependencies);
      }
      await resolvedDependencies.complete(job.id);
      attempts.push({ jobId: job.id, jobType: job.jobType, outcome: "completed" });
    } catch (error) {
      await resolvedDependencies.fail(job.id, safeErrorMessage(error));
      attempts.push({ jobId: job.id, jobType: job.jobType, outcome: "failed" });
    }
  }
  return attempts;
}
