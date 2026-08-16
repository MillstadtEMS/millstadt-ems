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
  testSinkDomain: string;
  testRecipientAllowlist: string[];
};

function boolEnv(name: string, fallback: boolean) {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  return value.toLowerCase() === "true";
}

function emailList(name: string) {
  return (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
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
      testSinkDomain: "",
      testRecipientAllowlist: [],
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
  const testSinkDomain = (
    process.env.MILLSTADT_INFORMATION_HUB_TEST_SINK_DOMAIN ?? "example.test"
  )
    .trim()
    .toLowerCase();
  const testRecipientAllowlist = emailList(
    "MILLSTADT_INFORMATION_HUB_TEST_RECIPIENT_ALLOWLIST",
  );
  const permitted = (email: string) =>
    testRecipientAllowlist.includes(email) ||
    Boolean(testSinkDomain && email.endsWith(`@${testSinkDomain}`));

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
    adminEmails: testDeliveryEnabled
      ? emailList("MILLSTADT_INFORMATION_HUB_TEST_ADMIN_EMAILS").filter(permitted)
      : [],
    adminSmsNumber: "",
    testDeliveryEnabled,
    testSinkDomain,
    testRecipientAllowlist,
  };
}

export function isAllowedFinancialsTestRecipient(
  email: string,
  config = getFinancialsHubConfig(),
) {
  const normalized = email.trim().toLowerCase();
  return Boolean(
    config.environment === "development" &&
      config.testDeliveryEnabled &&
      normalized &&
      (config.testRecipientAllowlist.includes(normalized) ||
        (config.testSinkDomain && normalized.endsWith(`@${config.testSinkDomain}`))),
  );
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
