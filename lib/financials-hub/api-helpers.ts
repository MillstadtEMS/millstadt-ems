import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getFinancialsHubConfig } from "./config";
import { ORGANIZATION_NAME } from "./types";
import {
  FinancialsHubError,
  isValidDevelopmentAdmin,
} from "./dev-store";

export function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function disabledFinancialsResponse() {
  return noStoreJson(
    {
      error:
        `The ${ORGANIZATION_NAME} Financial Transparency page is disabled.`,
      productionBehavior: "Coming Soon only",
    },
    { status: 404 },
  );
}

export function requireFinancialsCapability(
  capability: "requests" | "viewer" | "documents" | "public990s",
) {
  const config = getFinancialsHubConfig();
  if (!config.enabled || !config.syntheticDataOnly) return null;
  if (capability === "requests" && !config.allowRequests) return null;
  if (capability === "viewer" && !config.allowViewer) return null;
  if (capability === "documents" && !config.allowDocumentApis) return null;
  if (capability === "public990s" && !config.allowPublic990s) return null;
  if (config.environment !== "development") return null;
  return config;
}

export async function requireFinancialsAdmin(headers: Headers, method = "GET") {
  const config = requireFinancialsCapability("requests");
  if (!config) return { response: disabledFinancialsResponse() };
  if (!/^(GET|HEAD)$/i.test(method) && !isSameOrigin(headers)) {
    return {
      response: noStoreJson({ error: "Cross-site admin action was blocked." }, { status: 403 }),
    };
  }
  if (config.adminCode && isValidDevelopmentAdmin(headers, config.adminCode)) return { config };
  const denied = await requireAdmin();
  if (denied) return { response: denied };
  return { config };
}

function isSameOrigin(headers: Headers) {
  const origin = headers.get("origin");
  const host = headers.get("host");
  const fetchSite = headers.get("sec-fetch-site");
  if (!origin && fetchSite !== "same-origin") return false;
  if (fetchSite && fetchSite !== "same-origin") return false;
  if (!origin) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function handleFinancialsError(error: unknown) {
  if (error instanceof FinancialsHubError) {
    return noStoreJson({ error: error.message }, { status: error.status });
  }
  console.error(
    "[financials hub] request failed",
    error instanceof Error ? error.name : "UnknownError",
  );
  return noStoreJson({ error: "Request failed" }, { status: 500 });
}
