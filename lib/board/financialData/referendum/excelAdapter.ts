import { REFERENDUM_WORKBOOK_FIELD_MAP, REFERENDUM_WORKBOOK_IDENTITY } from "./workbookMapping";

export interface ReferendumWorkbookConnectionStatus {
  status: "Connected" | "Configuration Required" | "Synchronization Pending" | "Synchronization Error" | "Last Successful Sync";
  workbook: typeof REFERENDUM_WORKBOOK_IDENTITY;
  editableFields: typeof REFERENDUM_WORKBOOK_FIELD_MAP;
  missingConfiguration: string[];
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

function readConfig(): { config: GraphConfig | null; missing: string[] } {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length) return { config: null, missing };
  return {
    config: {
      tenantId: process.env.MICROSOFT_TENANT_ID!,
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      driveId: process.env.REFERENDUM_WORKBOOK_DRIVE_ID!,
      itemId: process.env.REFERENDUM_WORKBOOK_ITEM_ID!,
    },
    missing: [],
  };
}

export function getReferendumWorkbookConnectionStatus(): ReferendumWorkbookConnectionStatus {
  const { config, missing } = readConfig();
  return {
    status: config ? "Connected" : "Configuration Required",
    workbook: REFERENDUM_WORKBOOK_IDENTITY,
    editableFields: REFERENDUM_WORKBOOK_FIELD_MAP,
    missingConfiguration: missing,
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
  const { config, missing } = readConfig();
  if (!config) throw new Error(`Microsoft Graph configuration is missing: ${missing.join(", ")}`);

  const token = await getGraphAccessToken(config);
  const response = await fetch(`https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(config.driveId)}/items/${encodeURIComponent(config.itemId)}/content`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Workbook download failed (${response.status}): ${text.slice(0, 300)}`);
  }
  return Buffer.from(await response.arrayBuffer());
}
