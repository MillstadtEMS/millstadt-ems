export type FinancialsHubConfig = {
  environment: "production" | "development";
  enabled: boolean;
  allowRequests: boolean;
  allowViewer: boolean;
  allowDocumentApis: boolean;
  allowPublic990s: boolean;
  syntheticDataOnly: boolean;
  adminCode: string;
  adminEmails: string[];
  adminSmsNumber: string;
  testDeliveryEnabled: boolean;
};

function boolEnv(name: string, fallback: boolean) {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  return value.toLowerCase() === "true";
}

function testSinkEmails() {
  const sinkDomain = (process.env.MILLSTADT_INFORMATION_HUB_TEST_SINK_DOMAIN ?? "example.test")
    .trim()
    .toLowerCase();
  return (process.env.MILLSTADT_INFORMATION_HUB_TEST_ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .filter((email) => email.endsWith(`@${sinkDomain}`));
}

export function getFinancialsHubConfig(): FinancialsHubConfig {
  const productionRuntime =
    process.env.NODE_ENV === "production" ||
    process.env.MILLSTADT_INFORMATION_HUB_ENV === "production";

  if (productionRuntime) {
    return {
      environment: "production",
      enabled: false,
      allowRequests: false,
      allowViewer: false,
      allowDocumentApis: false,
      allowPublic990s: false,
      syntheticDataOnly: false,
      adminCode: "",
      adminEmails: [],
      adminSmsNumber: "",
      testDeliveryEnabled: false,
    };
  }

  const enabled = boolEnv("MILLSTADT_INFORMATION_HUB_ENABLED", true);
  const syntheticDataOnly = boolEnv(
    "MILLSTADT_INFORMATION_HUB_SYNTHETIC_DATA_ONLY",
    true,
  );
  const testDeliveryEnabled = boolEnv(
    "MILLSTADT_INFORMATION_HUB_TEST_DELIVERY_ENABLED",
    false,
  );

  return {
    environment: "development",
    enabled,
    allowRequests: enabled && boolEnv("MILLSTADT_INFORMATION_HUB_ALLOW_REQUESTS", true),
    allowViewer: enabled && boolEnv("MILLSTADT_INFORMATION_HUB_ALLOW_VIEWER", true),
    allowDocumentApis:
      enabled && boolEnv("MILLSTADT_INFORMATION_HUB_ALLOW_DOCUMENT_APIS", true),
    allowPublic990s:
      enabled && boolEnv("MILLSTADT_INFORMATION_HUB_ALLOW_PUBLIC_990S", true),
    syntheticDataOnly,
    adminCode: process.env.MILLSTADT_INFORMATION_HUB_DEV_ADMIN_CODE ?? "",
    adminEmails: testDeliveryEnabled ? testSinkEmails() : [],
    adminSmsNumber: "",
    testDeliveryEnabled,
  };
}

export function isFinancialsHubDevelopmentEnabled() {
  const config = getFinancialsHubConfig();
  return (
    config.environment === "development" &&
    config.enabled &&
    config.allowRequests &&
    config.allowViewer &&
    config.allowDocumentApis &&
    config.syntheticDataOnly
  );
}
