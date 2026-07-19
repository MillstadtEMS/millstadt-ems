import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../lib/board/financialData/referendum/workbookIdentity.ts", import.meta.url), "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    esModuleInterop: true,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});

const cjsModule = { exports: {} };
vm.runInNewContext(transpiled.outputText, {
  module: cjsModule,
  exports: cjsModule.exports,
  require,
  URL,
  process: { env: {} },
});

const {
  DEFAULT_REFERENDUM_WORKBOOK_EXPECTED_ACCOUNT,
  DEFAULT_REFERENDUM_WORKBOOK_EXPECTED_FILENAME,
  DEFAULT_REFERENDUM_WORKBOOK_EXPECTED_FOLDER,
  buildGraphWorkbookPathMetadataUrl,
  getExpectedReferendumWorkbookIdentity,
  isSharingUrlLike,
  validateDurableGraphIdentifier,
  validateReferendumWorkbookDriveItem,
} = cjsModule.exports;

function exactWorkbook(overrides = {}) {
  return {
    id: "ITEM_ID_FROM_GRAPH",
    name: DEFAULT_REFERENDUM_WORKBOOK_EXPECTED_FILENAME,
    file: { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    parentReference: {
      driveId: "DRIVE_ID_FROM_PARENT_REFERENCE",
      path: `/drive/root:/${DEFAULT_REFERENDUM_WORKBOOK_EXPECTED_FOLDER}`,
    },
    ...overrides,
  };
}

test("validates the exact approved OneDrive workbook metadata", () => {
  const result = validateReferendumWorkbookDriveItem(exactWorkbook(), {
    connectedAccount: DEFAULT_REFERENDUM_WORKBOOK_EXPECTED_ACCOUNT,
    requireConnectedAccount: true,
  });

  assert.equal(result.ok, true);
  assert.equal(result.driveId, "DRIVE_ID_FROM_PARENT_REFERENCE");
  assert.equal(result.itemId, "ITEM_ID_FROM_GRAPH");
  assert.equal(result.actual.parentFolder, DEFAULT_REFERENDUM_WORKBOOK_EXPECTED_FOLDER);
});

test("rejects wrong workbook names and non-xlsx files", () => {
  const result = validateReferendumWorkbookDriveItem(exactWorkbook({ name: "Millstadt_EMS_Referendum_Financial_Model.xlsm" }));

  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === "filename_mismatch"));
  assert.ok(result.issues.some((issue) => issue.code === "extension_mismatch"));
});

test("rejects the right filename in the wrong parent folder", () => {
  const result = validateReferendumWorkbookDriveItem(
    exactWorkbook({
      parentReference: {
        driveId: "DRIVE_ID_FROM_PARENT_REFERENCE",
        path: "/drive/root:/Board Portal/Referendum",
      },
    }),
  );

  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === "parent_folder_mismatch"));
});

test("rejects folders masquerading as workbook items", () => {
  const result = validateReferendumWorkbookDriveItem(
    exactWorkbook({
      file: undefined,
      folder: { childCount: 1 },
    }),
  );

  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === "item_is_not_file"));
});

test("rejects unapproved connected Microsoft accounts during discovery", () => {
  const result = validateReferendumWorkbookDriveItem(exactWorkbook(), {
    connectedAccount: "Kenneth.james@millstadtems.org",
    requireConnectedAccount: true,
  });

  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === "connected_account_mismatch"));
});

test("does not add a connected-account requirement when existing ID sync validation runs", () => {
  const result = validateReferendumWorkbookDriveItem(exactWorkbook(), {
    requireConnectedAccount: false,
  });

  assert.equal(result.ok, true);
});

test("builds a safely encoded Graph path lookup URL for the expected workbook", () => {
  const url = buildGraphWorkbookPathMetadataUrl(getExpectedReferendumWorkbookIdentity({}));

  assert.equal(
    url,
    "https://graph.microsoft.com/v1.0/me/drive/root:/01.%20BOD%20WEBMASTER/Millstadt%20EMS%20referendum%20budget%20web%20master.xlsx",
  );
});

test("rejects OneDrive sharing links as durable Graph identifiers", () => {
  const link = "https://1drv.ms/f/c/b228a2efc1071cad/IgAx_lVMTr29SY-MpvEAgU3BASuVbSNcLyrRVJXGr33J7Ks?e=VUgFYj";
  const issues = validateDurableGraphIdentifier("REFERENDUM_WORKBOOK_ITEM_ID", link);

  assert.equal(isSharingUrlLike(link), true);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, "sharing_link_used_as_graph_id");
  assert.equal(
    issues[0].message,
    "REFERENDUM_WORKBOOK_ITEM_ID must be the stable Microsoft Graph ID, not a OneDrive sharing link.",
  );
});
