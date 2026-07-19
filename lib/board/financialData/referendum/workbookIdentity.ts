export const DEFAULT_REFERENDUM_WORKBOOK_EXPECTED_FOLDER = "01. BOD WEBMASTER";
export const DEFAULT_REFERENDUM_WORKBOOK_EXPECTED_FILENAME = "Millstadt EMS referendum budget web master.xlsx";
export const DEFAULT_REFERENDUM_WORKBOOK_EXPECTED_ACCOUNT = "millstadtems@gmail.com";

const GRAPH_API_ROOT = "https://graph.microsoft.com";
const GRAPH_API_VERSION = "v1.0";

export interface ReferendumWorkbookExpectedIdentity {
  owner: string;
  folder: string;
  fileName: string;
  path: string;
}

export interface ConnectedMicrosoftAccount {
  mail?: string | null;
  userPrincipalName?: string | null;
  email?: string | null;
}

export interface GraphDriveItem {
  id?: unknown;
  name?: unknown;
  file?: unknown;
  folder?: unknown;
  parentReference?: {
    driveId?: unknown;
    path?: unknown;
    name?: unknown;
  };
}

export interface WorkbookValidationIssue {
  code: string;
  message: string;
}

export interface ReferendumWorkbookValidationResult {
  ok: boolean;
  expected: ReferendumWorkbookExpectedIdentity;
  issues: WorkbookValidationIssue[];
  driveId?: string;
  itemId?: string;
  actual: {
    connectedAccount?: string;
    fileName?: string;
    parentFolder?: string;
    isFile: boolean;
    isFolder: boolean;
  };
}

function valueOrDefault(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export function getExpectedReferendumWorkbookIdentity(
  env: NodeJS.ProcessEnv = process.env,
): ReferendumWorkbookExpectedIdentity {
  const folder = valueOrDefault(env.REFERENDUM_WORKBOOK_EXPECTED_FOLDER, DEFAULT_REFERENDUM_WORKBOOK_EXPECTED_FOLDER);
  const fileName = valueOrDefault(env.REFERENDUM_WORKBOOK_EXPECTED_FILENAME, DEFAULT_REFERENDUM_WORKBOOK_EXPECTED_FILENAME);
  const owner = valueOrDefault(env.REFERENDUM_WORKBOOK_EXPECTED_ACCOUNT, DEFAULT_REFERENDUM_WORKBOOK_EXPECTED_ACCOUNT);

  return {
    owner,
    folder,
    fileName,
    path: `/${folder}/${fileName}`,
  };
}

export function normalizeMicrosoftAccount(account?: ConnectedMicrosoftAccount | string | null) {
  if (!account) return null;
  if (typeof account === "string") return account.trim().toLowerCase() || null;

  const value = account.mail ?? account.userPrincipalName ?? account.email ?? null;
  return value?.trim().toLowerCase() || null;
}

export function isSharingUrlLike(value: string) {
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;

  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    return host === "1drv.ms" || host.endsWith(".1drv.ms") || host.includes("onedrive") || host.endsWith("sharepoint.com");
  } catch {
    return false;
  }
}

export function validateDurableGraphIdentifier(envName: string, value?: string) {
  const issues: WorkbookValidationIssue[] = [];
  const trimmed = value?.trim();
  if (!trimmed) return issues;

  if (/^https?:\/\//i.test(trimmed) || isSharingUrlLike(trimmed)) {
    issues.push({
      code: "sharing_link_used_as_graph_id",
      message: `${envName} must be the stable Microsoft Graph ID, not a OneDrive sharing link.`,
    });
  }

  return issues;
}

export function extractParentFolderName(parentReference: GraphDriveItem["parentReference"]) {
  const path = typeof parentReference?.path === "string" ? parentReference.path : "";
  const fallback = typeof parentReference?.name === "string" ? parentReference.name.trim() : "";
  if (!path) return fallback || null;

  const rootMarker = "root:";
  const rootIndex = path.lastIndexOf(rootMarker);
  const parentPath = rootIndex >= 0 ? path.slice(rootIndex + rootMarker.length) : path;
  const decodedPath = decodeURIComponent(parentPath).replace(/\/+$/, "");
  const segments = decodedPath.split("/").filter(Boolean);
  return segments.at(-1) ?? (fallback || null);
}

export function buildGraphWorkbookPathMetadataUrl(
  expected: ReferendumWorkbookExpectedIdentity = getExpectedReferendumWorkbookIdentity(),
) {
  const url = new URL(`/${GRAPH_API_VERSION}/me/drive/root:/`, GRAPH_API_ROOT);
  url.pathname = `/${GRAPH_API_VERSION}/me/drive/root:/${expected.folder}/${expected.fileName}`;
  return url.toString();
}

export function buildGraphDriveItemMetadataUrl(driveId: string, itemId: string) {
  const url = new URL(
    `/${GRAPH_API_VERSION}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}`,
    GRAPH_API_ROOT,
  );
  url.searchParams.set("$select", "id,name,file,folder,parentReference");
  return url.toString();
}

export function buildGraphDriveItemContentUrl(driveId: string, itemId: string) {
  return new URL(
    `/${GRAPH_API_VERSION}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/content`,
    GRAPH_API_ROOT,
  ).toString();
}

export function validateReferendumWorkbookDriveItem(
  item: GraphDriveItem,
  options: {
    expected?: ReferendumWorkbookExpectedIdentity;
    connectedAccount?: ConnectedMicrosoftAccount | string | null;
    requireConnectedAccount?: boolean;
  } = {},
): ReferendumWorkbookValidationResult {
  const expected = options.expected ?? getExpectedReferendumWorkbookIdentity();
  const connectedAccount = normalizeMicrosoftAccount(options.connectedAccount);
  const itemId = typeof item.id === "string" ? item.id.trim() : "";
  const driveId = typeof item.parentReference?.driveId === "string" ? item.parentReference.driveId.trim() : "";
  const fileName = typeof item.name === "string" ? item.name.trim() : "";
  const parentFolder = extractParentFolderName(item.parentReference);
  const isFile = Boolean(item.file) && !item.folder;
  const isFolder = Boolean(item.folder);
  const issues: WorkbookValidationIssue[] = [];

  if (options.requireConnectedAccount && !connectedAccount) {
    issues.push({
      code: "connected_account_missing",
      message: `Microsoft Graph discovery must confirm the connected account is ${expected.owner}.`,
    });
  } else if (connectedAccount && connectedAccount !== expected.owner.toLowerCase()) {
    issues.push({
      code: "connected_account_mismatch",
      message: `Connected Microsoft account is ${connectedAccount}; expected ${expected.owner}.`,
    });
  }

  if (!itemId) {
    issues.push({ code: "item_id_missing", message: "Microsoft Graph item.id is missing." });
  }

  if (!driveId) {
    issues.push({
      code: "drive_id_missing",
      message: "Microsoft Graph parentReference.driveId is missing.",
    });
  }

  if (fileName !== expected.fileName) {
    issues.push({
      code: "filename_mismatch",
      message: `Workbook filename is ${fileName || "(missing)"}; expected ${expected.fileName}.`,
    });
  }

  if (!fileName.toLowerCase().endsWith(".xlsx")) {
    issues.push({ code: "extension_mismatch", message: "Workbook must be an .xlsx file." });
  }

  if (!isFile || isFolder) {
    issues.push({ code: "item_is_not_file", message: "Microsoft Graph item must be a file, not a folder." });
  }

  if (parentFolder !== expected.folder) {
    issues.push({
      code: "parent_folder_mismatch",
      message: `Workbook parent folder is ${parentFolder || "(missing)"}; expected ${expected.folder}.`,
    });
  }

  return {
    ok: issues.length === 0,
    expected,
    issues,
    driveId: driveId || undefined,
    itemId: itemId || undefined,
    actual: {
      connectedAccount: connectedAccount ?? undefined,
      fileName: fileName || undefined,
      parentFolder: parentFolder ?? undefined,
      isFile,
      isFolder,
    },
  };
}

export function formatReferendumWorkbookValidationError(result: ReferendumWorkbookValidationResult) {
  return [
    `OneDrive workbook validation failed for ${result.expected.path}.`,
    ...result.issues.map((issue) => issue.message),
  ].join(" ");
}
