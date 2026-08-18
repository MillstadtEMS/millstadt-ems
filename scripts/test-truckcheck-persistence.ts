import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  formatChicagoDate,
  formatChicagoMilitaryTime,
  persistAuthoritativeTruckCheck,
  truckCheckRequestHash,
  TruckCheckIdempotencyConflictError,
  type AuthoritativeTruckCheckInput,
  type PersistedTruckCheckPayload,
  type TruckCheckSqlClient,
} from "@/lib/truckcheck/db";
import {
  authenticateTruckCheckSession,
  makeSessionToken,
  verifySessionToken,
} from "@/lib/truckcheck/auth";
import {
  processTruckCheckOutbox,
  type TruckCheckOutboxDependencies,
} from "@/lib/truckcheck/outbox";
import type { LoungeEmployee } from "@/lib/lounge/auth";

process.env.TRUCKCHECK_SESSION_SECRET = "fictional-truckcheck-test-secret-that-is-not-deployed";

const item = {
  itemKey: "fictional-item",
  label: "Fictional item",
  category: "Fictional category",
  responseType: "passfail",
  status: "Pass",
  numericValue: null,
  unitOfMeasure: null,
  amountAdded: null,
  amountUnit: null,
  comment: "Fictional test only",
  photos: [],
  isAbnormal: false,
  requiresFollowUp: false,
  trendGroup: null,
  checkedAt: "2026-08-17T14:30:00.000Z",
};

const payload: PersistedTruckCheckPayload = {
  formVersion: 5,
  form: {
    unitNumber: "TEST-3926",
    truckNumber: "TEST-3926",
    attendant1Name: "Fictional Employee",
    attendant2Name: "Fictional Partner",
    attendant1Signature: "data:image/png;base64,ZmFrZQ==",
    attendant2Signature: "data:image/png;base64,ZmFrZTI=",
    startedAt: "2026-08-17T14:00:00.000Z",
    submittedAt: "2026-08-17T14:30:00.000Z",
    durationSeconds: 1_800,
    items: [item],
    photos: [{
      url: "https://preview.example.test/api/truckcheck/photo?ref=fictional",
      caption: "Fictional photo",
    }],
    categoryComments: { Cab: "Fictional category note" },
    refillRequest: "Fictional refill request",
    attendants: [{
      id: "fictional-employee-2",
      name: "Fictional Partner",
      signature: "data:image/png;base64,ZmFrZTI=",
    }],
    notes: "Fictional test only",
  },
  submitter: { id: "fictional-employee-1", name: "Fictional Employee" },
  unit: { number: "TEST-3926", description: "Fictional test unit" },
  photos: [{
    url: "https://preview.example.test/api/truckcheck/photo?ref=fictional",
    caption: "Fictional photo",
  }],
  categoryComments: { Cab: "Fictional category note" },
  refillRequest: "Fictional refill request",
  pencilWhip: { flag: "normal", reasons: [] },
  overallStatus: "pass",
  abnormalCount: 0,
  failCount: 0,
};

const persistenceInput: AuthoritativeTruckCheckInput = {
  id: "fictional-check-1",
  actorId: payload.submitter.id,
  idempotencyKey: "fictional-idempotency-key-1",
  requestHash: truckCheckRequestHash(payload.form),
  unitNumber: payload.unit.number,
  dateIso: "2026-08-17",
  timeHhmm: "09:30",
  submittedAt: payload.form.submittedAt!,
  startedAt: payload.form.startedAt!,
  durationSeconds: payload.form.durationSeconds!,
  overallStatus: payload.overallStatus,
  pencilWhipFlag: payload.pencilWhip.flag,
  pencilWhipReasons: payload.pencilWhip.reasons,
  attendant2Id: payload.form.attendants[0].id,
  attendant2Name: payload.form.attendants[0].name,
  notes: payload.form.notes,
  payload,
};

type FakeQuery = Promise<unknown> & { marker: string };

function fakeDatabase(options: {
  failAt?: string;
  duplicate?: { requestHash: string; result: unknown };
} = {}) {
  const committed: string[] = [];
  const direct = ((strings: TemplateStringsArray) => {
    const text = strings.join(" ");
    if (!text.includes("SELECT request_hash, submission_result")) {
      return Promise.resolve([]);
    }
    return Promise.resolve(options.duplicate ? [{
      request_hash: options.duplicate.requestHash,
      submission_result: options.duplicate.result,
    }] : []);
  }) as TruckCheckSqlClient;
  direct.transaction = async (builder) => {
    const transactionSql = ((strings: TemplateStringsArray) => {
      const marker = strings.join(" ").match(/truckcheck:(submission|items|photos|outbox)/)?.[1] ?? "unknown";
      const query = Promise.resolve([]) as FakeQuery;
      query.marker = marker;
      return query;
    }) as Parameters<TruckCheckSqlClient["transaction"]>[0] extends (sql: infer Sql) => unknown ? Sql : never;
    const queries = builder(transactionSql) as FakeQuery[];
    const pending: string[] = [];
    const results: unknown[][] = [];
    for (const query of queries) {
      pending.push(query.marker);
      if (query.marker === options.failAt) throw new Error(`forced ${query.marker} failure`);
      results.push(query.marker === "submission" && !options.duplicate ? [{ id: persistenceInput.id }] : []);
    }
    if (!options.duplicate) committed.push(...pending);
    return results;
  };
  return { database: direct, committed };
}

for (const failedInsert of ["submission", "items", "photos", "outbox"] as const) {
  test(`${failedInsert} insert failure rolls back the complete authoritative write`, async () => {
    const fake = fakeDatabase({ failAt: failedInsert });
    await assert.rejects(
      persistAuthoritativeTruckCheck(persistenceInput, fake.database),
      new RegExp(`forced ${failedInsert} failure`),
    );
    assert.deepEqual(fake.committed, []);
  });
}

test("authoritative transaction commits the record, items, photos, and outbox together", async () => {
  const fake = fakeDatabase();
  const result = await persistAuthoritativeTruckCheck(persistenceInput, fake.database);
  assert.equal(result.id, persistenceInput.id);
  assert.equal(result.replayed, false);
  assert.deepEqual(fake.committed, ["submission", "items", "photos", "outbox"]);
});

test("duplicate retry replays the original success without another insert", async () => {
  const stored = {
    ok: true,
    id: persistenceInput.id,
    flag: "normal",
    durationSeconds: 1_800,
    pdfUrl: null,
    replayed: false,
  };
  const fake = fakeDatabase({ duplicate: { requestHash: persistenceInput.requestHash, result: stored } });
  const replay = await persistAuthoritativeTruckCheck(persistenceInput, fake.database);
  assert.equal(replay.id, persistenceInput.id);
  assert.equal(replay.replayed, true);
  assert.deepEqual(fake.committed, []);
});

test("idempotency key reuse with changed data is rejected", async () => {
  const fake = fakeDatabase({
    duplicate: { requestHash: "different-request-hash", result: { ok: true } },
  });
  await assert.rejects(
    persistAuthoritativeTruckCheck(persistenceInput, fake.database),
    TruckCheckIdempotencyConflictError,
  );
});

test("military time stays Chicago-local and canonical hashing ignores object key order", () => {
  assert.equal(formatChicagoMilitaryTime("2026-08-17T14:30:00.000Z"), "09:30");
  assert.equal(formatChicagoMilitaryTime("2026-08-17T05:05:00.000Z"), "00:05");
  assert.equal(formatChicagoDate("2026-08-18T04:30:00.000Z"), "2026-08-17");
  assert.equal(formatChicagoDate("2026-08-18T05:30:00.000Z"), "2026-08-18");
  assert.equal(truckCheckRequestHash({ b: 2, a: 1 }), truckCheckRequestHash({ a: 1, b: 2 }));
});

const employee: LoungeEmployee = {
  id: "fictional-employee-1",
  username: "fictional.employee",
  firstName: "Fictional",
  lastName: "Employee",
  isAdmin: false,
  isActive: true,
  mustChangePassword: false,
  passwordHash: "fictional-password-hash",
  setupTokenHash: null,
  setupTokenExpiresAt: null,
  setupTokenUsedAt: null,
};

test("TruckCheck SSO is attributed to one employee and one active Lounge session", async () => {
  const now = Date.UTC(2026, 7, 17, 14, 30);
  const token = makeSessionToken(employee.id, "lounge-session-a", {
    now,
    nonce: "fictional-nonce-123456",
  });
  assert.equal(verifySessionToken(token, "lounge-session-a", now)?.sub, employee.id);
  assert.equal(verifySessionToken(token, "lounge-session-b", now), null);
  assert.equal(verifySessionToken(token, "lounge-session-a", now + 15 * 60_000), null);

  const attributed = await authenticateTruckCheckSession(
    token,
    "lounge-session-a",
    async () => employee,
    now,
  );
  assert.equal(attributed?.id, employee.id);
  assert.equal(await authenticateTruckCheckSession(token, "lounge-session-a", async () => null, now), null);
  assert.equal(await authenticateTruckCheckSession(
    token,
    "lounge-session-a",
    async () => ({ ...employee, id: "different-employee" }),
    now,
  ), null);
});

function outboxDependencies(options: {
  jobType: "legacy_copy" | "pdf_email";
  failLegacy?: boolean;
  failPdf?: boolean;
  failEmail?: boolean;
}) {
  let available = true;
  const completed: string[] = [];
  const failed: Array<{ id: string; message: string }> = [];
  const savedPdfReferences: string[] = [];
  let emailCalls = 0;
  const dependencies: TruckCheckOutboxDependencies = {
    claim: async () => {
      if (!available) return null;
      available = false;
      return {
        id: `fictional-${options.jobType}-job`,
        truckCheckId: persistenceInput.id,
        jobType: options.jobType,
        attemptCount: 1,
      };
    },
    complete: async (id) => { completed.push(id); },
    fail: async (id, message) => { failed.push({ id, message }); },
    load: async () => payload,
    writeLegacy: async () => {
      if (options.failLegacy) throw new Error("forced legacy failure");
    },
    buildPdf: async () => {
      if (options.failPdf) throw new Error("forced PDF failure");
      return Buffer.from("fictional-pdf");
    },
    uploadPdf: async () => "private:truckcheck/pdf/fictional-check-1.pdf",
    savePdfReference: async (_id, reference) => { savedPdfReferences.push(reference); },
    sendEmail: async () => {
      emailCalls += 1;
      if (options.failEmail) throw new Error("forced email failure");
    },
  };
  return {
    dependencies,
    completed,
    failed,
    savedPdfReferences,
    emailCalls: () => emailCalls,
  };
}

test("legacy migration failure is recorded separately from the saved check", async () => {
  const fake = outboxDependencies({ jobType: "legacy_copy", failLegacy: true });
  const attempts = await processTruckCheckOutbox(persistenceInput.id, fake.dependencies);
  assert.deepEqual(attempts.map((attempt) => attempt.outcome), ["failed"]);
  assert.match(fake.failed[0].message, /legacy failure/);
  assert.deepEqual(fake.completed, []);
});

test("PDF failure remains retryable and never reaches email", async () => {
  const fake = outboxDependencies({ jobType: "pdf_email", failPdf: true });
  const attempts = await processTruckCheckOutbox(persistenceInput.id, fake.dependencies);
  assert.deepEqual(attempts.map((attempt) => attempt.outcome), ["failed"]);
  assert.match(fake.failed[0].message, /PDF failure/);
  assert.equal(fake.emailCalls(), 0);
  assert.deepEqual(fake.savedPdfReferences, []);
});

test("email failure retains the generated private PDF and remains retryable", async () => {
  const fake = outboxDependencies({ jobType: "pdf_email", failEmail: true });
  const attempts = await processTruckCheckOutbox(persistenceInput.id, fake.dependencies);
  assert.deepEqual(attempts.map((attempt) => attempt.outcome), ["failed"]);
  assert.match(fake.failed[0].message, /email failure/);
  assert.equal(fake.savedPdfReferences.length, 1);
  assert.equal(fake.emailCalls(), 1);
});

test("a later outbox replay completes without creating another TruckCheck", async () => {
  const first = outboxDependencies({ jobType: "pdf_email", failEmail: true });
  await processTruckCheckOutbox(persistenceInput.id, first.dependencies);
  assert.equal(first.failed.length, 1);

  const replay = outboxDependencies({ jobType: "pdf_email" });
  const attempts = await processTruckCheckOutbox(persistenceInput.id, replay.dependencies);
  assert.deepEqual(attempts.map((attempt) => attempt.outcome), ["completed"]);
  assert.deepEqual(replay.completed, ["fictional-pdf_email-job"]);
  assert.equal(replay.emailCalls(), 1);
});

test("the route fails closed and moves delivery work after the response", async () => {
  const route = await readFile("app/api/truckcheck/submit/route.ts", "utf8");
  const form = await readFile("app/truckcheck/TruckCheckForm.tsx", "utf8");
  assert.match(route, /persistAuthoritativeTruckCheck/);
  assert.match(route, /retryable:\s*true/);
  assert.match(route, /status:\s*503/);
  assert.match(route, /Retry-After/);
  assert.match(route, /after\(async \(\) =>/);
  assert.match(route, /currentTruckCheckEmployee/);
  assert.doesNotMatch(route, /body\.attendant1Name\s*\|\|/);
  assert.match(form, /"Idempotency-Key": submissionAttempt\.current\.idempotencyKey/);
});
