import { REFERENDUM_WORKBOOK_FIELD_MAP, REFERENDUM_WORKBOOK_IDENTITY } from "./workbookMapping";
import {
  buildGraphDriveItemContentUrl,
  buildGraphDriveItemMetadataUrl,
  buildGraphWorkbookPathMetadataUrl,
  formatReferendumWorkbookValidationError,
  getExpectedReferendumWorkbookIdentity,
  type GraphDriveItem,
  type ReferendumWorkbookExpectedIdentity,
  validateDurableGraphIdentifier,
  validateReferendumWorkbookDriveItem,
} from "./workbookIdentity";

export interface ReferendumWorkbookConnectionStatus {
  status: "Connected" | "Configuration Required" | "Synchronization Pending" | "Synchronization Error" | "Last Successful Sync";
  workbook: typeof REFERENDUM_WORKBOOK_IDENTITY;
  expectedWorkbook: ReferendumWorkbookExpectedIdentity;
  editableFields: typeof REFERENDUM_WORKBOOK_FIELD_MAP;
  missingConfiguration: string[];
  configurationIssues: string[];
}

interface GraphConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  driveId: string;
  itemId: string;
}

const REQUIRED_ENV = [
  "MICROSOFT_TENANT_ID",
  "MICROSOFT_CLIENT_ID",
  "MICROSOFT_CLIENT_SECRET",
  "REFERENDUM_WORKBOOK_DRIVE_ID",
  "REFERENDUM_WORKBOOK_ITEM_ID",
] as const;

function readConfig(): { config: GraphConfig | null; missing: string[]; configurationIssues: string[] } {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  const configurationIssues = [
    ...validateDurableGraphIdentifier("REFERENDUM_WORKBOOK_DRIVE_ID", process.env.REFERENDUM_WORKBOOK_DRIVE_ID),
    ...validateDurableGraphIdentifier("REFERENDUM_WORKBOOK_ITEM_ID", process.env.REFERENDUM_WORKBOOK_ITEM_ID),
  ].map((issue) => issue.message);

  if (missing.length || configurationIssues.length) return { config: null, missing, configurationIssues };

  return {
    config: {
      tenantId: process.env.MICROSOFT_TENANT_ID!,
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      driveId: process.env.REFERENDUM_WORKBOOK_DRIVE_ID!,
      itemId: process.env.REFERENDUM_WORKBOOK_ITEM_ID!,
    },
    missing: [],
    configurationIssues: [],
  };
}

export function getReferendumWorkbookConnectionStatus(): ReferendumWorkbookConnectionStatus {
  const { config, missing, configurationIssues } = readConfig();
  return {
    status: config ? "Connected" : "Configuration Required",
    workbook: REFERENDUM_WORKBOOK_IDENTITY,
    expectedWorkbook: getExpectedReferendumWorkbookIdentity(),
    editableFields: REFERENDUM_WORKBOOK_FIELD_MAP,
    missingConfiguration: missing,
    configurationIssues,
  };
}

async function getGraphAccessToken(config: GraphConfig): Promise<string> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default",
  });
  const response = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Microsoft Graph token request failed (${response.status}): ${text.slice(0, 300)}`);
  }
  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Microsoft Graph token response did not include an access token.");
  return data.access_token;
}

export async function downloadReferendumWorkbookFromOneDrive(): Promise<Buffer> {
  const { config, missing, configurationIssues } = readConfig();
  if (!config) {
    const details = [...missing, ...configurationIssues].join(", ");
    throw new Error(`Microsoft Graph configuration is missing or invalid: ${details}`);
  }

  const token = await getGraphAccessToken(config);

  const metadataResponse = await fetch(buildGraphDriveItemMetadataUrl(config.driveId, config.itemId), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!metadataResponse.ok) {
    const text = await metadataResponse.text().catch(() => "");
    throw new Error(`Workbook metadata lookup failed (${metadataResponse.status}): ${text.slice(0, 300)}`);
  }

  const metadata = (await metadataResponse.json()) as GraphDriveItem;
  const validation = validateReferendumWorkbookDriveItem(metadata, {
    expected: getExpectedReferendumWorkbookIdentity(),
    requireConnectedAccount: false,
  });
  if (!validation.ok) throw new Error(formatReferendumWorkbookValidationError(validation));

  const response = await fetch(buildGraphDriveItemContentUrl(validation.driveId!, validation.itemId!), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Workbook download failed (${response.status}): ${text.slice(0, 300)}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function discoverReferendumWorkbookByExpectedPath(
  delegatedGraphAccessToken: string,
  connectedAccount: string,
): Promise<{ driveId: string; itemId: string; path: string; fileName: string; owner: string }> {
  const expected = getExpectedReferendumWorkbookIdentity();
  const response = await fetch(buildGraphWorkbookPathMetadataUrl(expected), {
    headers: { Authorization: `Bearer ${delegatedGraphAccessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Expected OneDrive workbook was not found at ${expected.path} (${response.status}): ${text.slice(0, 300)}`);
  }

  const metadata = (await response.json()) as GraphDriveItem;
  const validation = validateReferendumWorkbookDriveItem(metadata, {
    expected,
    connectedAccount,
    requireConnectedAccount: true,
  });
  if (!validation.ok) throw new Error(formatReferendumWorkbookValidationError(validation));

  return {
    driveId: validation.driveId!,
    itemId: validation.itemId!,
    path: expected.path,
    fileName: expected.fileName,
    owner: expected.owner,
  };
}
