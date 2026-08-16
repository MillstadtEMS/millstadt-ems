export const ANALYTICS_CONSENT_VERSION = "2026-08-16.1";

export const OPTIONAL_ANALYTICS_CATEGORIES = [
  "aggregate",
  "returning_visitor",
  "broad_geography",
] as const;

export type OptionalAnalyticsCategory =
  (typeof OPTIONAL_ANALYTICS_CATEGORIES)[number];

export type ConsentStatus = "unknown" | "allowed" | "declined" | "withdrawn";

export const ANALYTICS_EVENT_NAMES = [
  "page_view",
  "engagement",
  "performance",
  "accessibility_control",
  "read_aloud",
  "print_selection",
  "document_view",
  "document_download",
  "accessible_alternative",
  "client_error",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export type AnalyticsEventInput = {
  eventName: AnalyticsEventName;
  path: string;
  occurredAt: string;
  durationMs?: number;
  value?: number;
  documentKind?: "public_form_990" | "restricted_document";
  documentId?: string;
  control?: string;
};

export type AnalyticsEventRecord = AnalyticsEventInput & {
  id: string;
  sessionHash: string | null;
  browserHash: string | null;
  returningBrowser: boolean | null;
  returnIntervalDays: number | null;
  browserCategory: string;
  operatingSystemCategory: string;
  deviceCategory: string;
  referringSource: string;
  country: string | null;
  region: string | null;
  city: string | null;
};

export type SecurityEventInput = {
  eventType: string;
  route: string;
  method: string;
  responseStatus: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  reason: string;
  administratorId?: string | null;
};

export type ConsentRecord = {
  id: string;
  status: ConsentStatus;
  consentVersion: string;
  categories: OptionalAnalyticsCategory[];
  decidedAt: string | null;
  withdrawnAt: string | null;
};

export type CommunityArea =
  | "north_millstadt"
  | "south_millstadt"
  | "central_millstadt"
  | "surrounding_communities"
  | "outside_millstadt_area"
  | "prefer_not_to_say";

export type AnalyticsSummary = {
  mode: "limited" | "optional";
  range: { from: string; to: string };
  overview: {
    pageViews: number;
    estimatedSessions: number;
    estimatedReturningSessions: number;
    estimatedFirstTimeBrowsers: number;
    estimatedReturningBrowsers: number;
    averageEstimatedEngagementSeconds: number;
    form990Views: number;
    form990Downloads: number;
    printSelections: number;
    accessibleAlternativeViews: number;
    accessibilityControlUses: number;
    readAloudUses: number;
    clientErrors: number;
    averagePageLoadMs: number;
  };
  topPages: Array<{ path: string; views: number }>;
  documentEvents: Array<{ eventName: string; documentKind: string; events: number }>;
  geography: Array<{ broadArea: string; events: number }>;
  returning: {
    aggregateVisitFrequency: number;
    averageReturnIntervalDays: number;
    methodology: string;
  };
  communitySurvey: Array<{ area: CommunityArea; responses: number }>;
  security: {
    failedLogins: number;
    rateLimitEvents: number;
    malwareScanEvents: number;
    unauthorizedAccessAttempts: number;
    administratorActions: number;
    systemErrors: number;
  };
  workflow: {
    restrictedRequests: number;
    approvals: number;
    denials: number;
    expirations: number;
    revocations: number;
    controlledViews: number;
  };
};
