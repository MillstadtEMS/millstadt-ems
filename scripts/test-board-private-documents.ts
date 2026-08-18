import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  decideBoardWorkbookSourceAccess,
  decideBoardWorkbookViewAccess,
  decideDraftBudgetDocumentAccess,
} from "../lib/board/document-access";
import {
  createPrivateDocumentResponse,
  parseSingleByteRange,
  PRIVATE_DOCUMENT_CACHE_CONTROL,
} from "../lib/board/document-http";
import type { BoardUser } from "../lib/board/db";
import {
  filterWorkbookForAudience,
  type BoardWorkbookView,
} from "../lib/board/workbook";

const root = process.cwd();

function boardUser(overrides: Partial<BoardUser> = {}): BoardUser {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    username: "boardmember",
    firstName: "Board",
    lastName: "Member",
    email: "board@example.test",
    phone: null,
    role: "ems_board",
    officerTitle: "Member",
    photoUrl: null,
    isActive: true,
    mustChangePassword: false,
    simpleViewDefault: false,
    isDevLogin: false,
    createdAt: "2026-08-17T00:00:00.000Z",
    ...overrides,
  };
}

function workbook(): BoardWorkbookView {
  const sheet = (name: string) => ({
    name,
    columns: [{ label: "A" }],
    rows: [],
    totalRows: 0,
    totalCols: 1,
    truncated: false,
  });
  return {
    viewVersion: 2,
    sourceName: "referendum.xlsx",
    downloadUrl: "/api/board/workbook/file",
    updatedAt: "2026-08-17T00:00:00.000Z",
    size: 100,
    sheets: [sheet("Overview"), sheet("EMS Salaries"), sheet("Fire Levy")],
    scenarios: [{ key: "baseline", label: "Baseline" }],
    defaultScenarioKey: "baseline",
    scenarioOverrides: {
      baseline: {
        "EMS Salaries": { A1: { text: "EMS private", isNumber: false } },
        "Fire Levy": { A1: { text: "Fire private", isNumber: false } },
      },
    },
    transferConfigs: [{ key: "one", label: "One", index: 1, crew: "Crew", netCollection: "$1" }],
    defaultTransferEnabled: true,
    defaultTransferConfigKey: "one",
    transferOverrides: {
      "baseline::transfer-on::one": {
        "EMS Salaries": { A1: { text: "EMS transfer", isNumber: false } },
        "Fire Levy": { A1: { text: "Fire transfer", isNumber: false } },
      },
    },
  };
}

function opened(value: string, contentType = "application/octet-stream") {
  const bytes = new TextEncoder().encode(value);
  return {
    stream: new Blob([bytes]).stream(),
    size: bytes.byteLength,
    contentType,
  };
}

test("Board workbook access denies anonymous and unauthorized identities", () => {
  assert.deepEqual(decideBoardWorkbookViewAccess(null, false), { allowed: false, status: 401 });
  assert.deepEqual(decideBoardWorkbookViewAccess(boardUser({ role: "fire_board" }), false), {
    allowed: false,
    status: 403,
  });
  assert.deepEqual(decideBoardWorkbookSourceAccess(boardUser()), { allowed: false, status: 403 });
  assert.deepEqual(
    decideBoardWorkbookSourceAccess(boardUser({ username: "kjames", isDevLogin: true })),
    { allowed: false, status: 403 },
  );
});

test("eligible Board audiences can read only the appropriate parsed view", () => {
  const ems = decideBoardWorkbookViewAccess(boardUser(), true);
  assert.equal(ems.allowed, true);
  if (ems.allowed) {
    assert.equal(ems.audience, "ems_board");
    assert.equal(ems.fullWorkbook, false);
  }

  const fire = decideBoardWorkbookViewAccess(boardUser({ role: "fire_board" }), true);
  assert.equal(fire.allowed, true);
  if (fire.allowed) assert.equal(fire.audience, "fire_board");

  const manager = boardUser({ username: "kjames", firstName: "Kenneth", lastName: "James" });
  assert.deepEqual(decideBoardWorkbookSourceAccess(manager), {
    allowed: true,
    fullWorkbook: true,
  });
});

test("sheet-level filtering keeps EMS and Fire Board audiences separate", () => {
  const source = workbook();
  const settings = {
    emsBoard: ["Overview", "EMS Salaries", "Scenarios"],
    fireBoard: ["Overview", "Fire Levy", "Scenarios"],
    updatedAt: null,
    updatedByName: null,
  };
  assert.deepEqual(
    filterWorkbookForAudience(source, "ems_board", settings).sheets.map((sheet) => sheet.name),
    ["Overview", "EMS Salaries"],
  );
  assert.deepEqual(
    filterWorkbookForAudience(source, "fire_board", settings).sheets.map((sheet) => sheet.name),
    ["Overview", "Fire Levy"],
  );
  const emsView = filterWorkbookForAudience(source, "ems_board", settings);
  const fireView = filterWorkbookForAudience(source, "fire_board", settings);
  assert.deepEqual(Object.keys(emsView.scenarioOverrides?.baseline ?? {}), ["EMS Salaries"]);
  assert.deepEqual(Object.keys(fireView.scenarioOverrides?.baseline ?? {}), ["Fire Levy"]);
  assert.equal(emsView.downloadUrl, "");
  assert.equal(emsView.transferConfigs, undefined);
  assert.equal(emsView.transferOverrides, undefined);
});

test("draft budget access distinguishes anonymous, wrong-role, and active admins", () => {
  assert.deepEqual(decideDraftBudgetDocumentAccess(null), { allowed: false, status: 401 });
  assert.deepEqual(
    decideDraftBudgetDocumentAccess({ isActive: true, isAdmin: false }),
    { allowed: false, status: 403 },
  );
  assert.deepEqual(
    decideDraftBudgetDocumentAccess({ isActive: true, isAdmin: true, mustChangePassword: true }),
    { allowed: false, status: 403 },
  );
  assert.deepEqual(
    decideDraftBudgetDocumentAccess({ isActive: true, isAdmin: true }),
    { allowed: true },
  );
});

test("private document responses support ranges and forbid caching", async () => {
  assert.deepEqual(parseSingleByteRange("bytes=2-5", 10), { start: 2, end: 5 });
  assert.deepEqual(parseSingleByteRange("bytes=-3", 10), { start: 7, end: 9 });
  assert.equal(parseSingleByteRange("bytes=20-30", 10), "invalid");

  const response = createPrivateDocumentResponse(opened("0123456789"), "bytes=2-5", {
    filename: "budget.pdf",
    disposition: "inline",
  });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("cache-control"), PRIVATE_DOCUMENT_CACHE_CONTROL);
  assert.equal(response.headers.get("accept-ranges"), "bytes");
  assert.equal(response.headers.get("content-range"), "bytes 2-5/10");
  assert.equal(response.headers.get("content-length"), "4");
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
  assert.equal(await response.text(), "2345");

  const invalid = createPrivateDocumentResponse(opened("0123456789"), "bytes=50-", {
    filename: "budget.pdf",
  });
  assert.equal(invalid.status, 416);
  assert.equal(invalid.headers.get("content-range"), "bytes */10");
  assert.equal(invalid.headers.get("cache-control"), PRIVATE_DOCUMENT_CACHE_CONTROL);
});

test("routes store new objects privately and expose only authenticated application URLs", async () => {
  const files = {
    boardRoute: "app/api/board/workbook/route.ts",
    boardFileRoute: "app/api/board/workbook/file/route.ts",
    budgetRoute: "app/api/admin/budget-documents/route.ts",
    budgetFileRoute: "app/api/admin/budget-documents/file/route.ts",
    storage: "lib/board/document-storage.ts",
    proxy: "proxy.ts",
  } as const;
  const source = Object.fromEntries(
    await Promise.all(Object.entries(files).map(async ([key, relative]) => [
      key,
      await readFile(path.join(root, relative), "utf8"),
    ])),
  ) as Record<keyof typeof files, string>;

  for (const uploadRoute of [source.boardRoute, source.budgetRoute]) {
    assert.match(uploadRoute, /access:\s*"private"/);
    assert.doesNotMatch(uploadRoute, /access:\s*"public"/);
    assert.doesNotMatch(uploadRoute, /\bblob\.url\b|\bblob\.downloadUrl\b|\bworkbookBlob\.url\b/);
  }
  assert.match(source.boardRoute, /decideBoardWorkbookViewAccess/);
  assert.match(source.boardRoute, /filterWorkbookForAudience/);
  assert.match(source.boardFileRoute, /decideBoardWorkbookSourceAccess/);
  assert.match(source.budgetRoute, /DRAFT_BUDGET_FILE_API_PATH/);
  assert.match(source.budgetFileRoute, /decideDraftBudgetDocumentAccess/);
  assert.match(source.storage, /CREATE TABLE IF NOT EXISTS board_document_manifest/);
  assert.match(source.storage, /legacy-public/);
  assert.match(source.proxy, /RETAINED_BOARD_MIGRATION_ARTIFACTS/);
  assert.match(source.proxy, /\/board\/referendum\/current\.xlsx/);
  assert.match(source.proxy, /\/board\/referendum\/current\.json/);
  assert.doesNotMatch(Object.values(source).join("\n"), /import\s*\{[\s\S]*?\bdel\b[\s\S]*?\}\s*from\s*["']@vercel\/blob["']/);
});

test("owner-approved cleanup remains a follow-up and tracked public fallbacks remain present", async () => {
  await access(path.join(root, "public/board/referendum/current.xlsx"));
  await access(path.join(root, "public/board/referendum/current.json"));
  const storage = await readFile(path.join(root, "lib/board/document-storage.ts"), "utf8");
  assert.match(storage, /LEGACY_BOARD_WORKBOOK_BLOB_PATH/);
  assert.match(storage, /LEGACY_DRAFT_BUDGET_BLOB_PATH/);
});
