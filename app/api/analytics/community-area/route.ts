import { NextRequest } from "next/server";
import { getAnalyticsConfig } from "@/lib/analytics/config";
import {
  allowAnalyticsRequest,
  contentLengthWithin,
  hasJsonContentType,
  isSameOriginRequest,
  noStoreJson,
} from "@/lib/analytics/http";
import { saveCommunitySurvey } from "@/lib/analytics/store";
import type { CommunityArea } from "@/lib/analytics/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AREAS = new Set<CommunityArea>([
  "north_millstadt",
  "south_millstadt",
  "central_millstadt",
  "surrounding_communities",
  "outside_millstadt_area",
  "prefer_not_to_say",
]);

export async function POST(req: NextRequest) {
  const config = getAnalyticsConfig();
  if (!config.communitySurveyEnabled) {
    return noStoreJson({ error: "The optional survey is not enabled." }, { status: 404 });
  }
  if (
    !isSameOriginRequest(req) ||
    !hasJsonContentType(req) ||
    !contentLengthWithin(req, 512)
  ) {
    return noStoreJson({ error: "Invalid survey request." }, { status: 403 });
  }
  if (!(await allowAnalyticsRequest(req, "community-area", 4, 60 * 60 * 1000))) {
    return noStoreJson({ error: "Survey response limit reached." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return noStoreJson({ error: "Invalid survey request." }, { status: 400 });
  }
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => key !== "area") ||
    !AREAS.has((body as { area?: CommunityArea }).area as CommunityArea)
  ) {
    return noStoreJson({ error: "Select a listed broad area." }, { status: 400 });
  }
  await saveCommunitySurvey((body as { area: CommunityArea }).area);
  return noStoreJson({ accepted: true }, { status: 201 });
}
