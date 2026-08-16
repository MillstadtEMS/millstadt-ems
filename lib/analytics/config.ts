import { ANALYTICS_CONSENT_VERSION } from "./types";

type RetentionConfig = {
  securityDays: number;
  eventDays: number;
  recurringVisitorDays: number;
  geographyDays: number;
  ageSurveyDays: number;
  preciseLocationDays: number;
  restrictedDocumentAuditDays: number;
  requestPdfDays: number;
  administratorActionDays: number;
  incidentHoldDays: number;
  consentDays: number;
};

export type AnalyticsConfig = {
  productionRuntime: boolean;
  mode: "limited" | "optional";
  optionalAnalyticsEnabled: boolean;
  developmentMemoryStore: boolean;
  privacyContact: string;
  jurisdictions: string[];
  analyticsSystem: string;
  dataCategories: string[];
  supervisorEmployeeIds: string[];
  serviceProviderContracts: string;
  securityControlsReviewed: boolean;
  breachResponseContacts: string;
  childrenPrivacySetting: string;
  healthInformationExclusionsReviewed: boolean;
  geolocationSetting: string;
  ageRangeSetting: string;
  consentSettingsReviewed: boolean;
  legalReviewApproved: boolean;
  preciseLocationEnabled: false;
  communitySurveyEnabled: boolean;
  consentVersion: string;
  minimumGroupSize: number;
  retention: RetentionConfig;
  missingConfiguration: string[];
};

function textEnv(name: string) {
  return (process.env[name] ?? "").trim();
}

function boolEnv(name: string, fallback = false) {
  const value = textEnv(name).toLowerCase();
  if (!value) return fallback;
  return value === "true";
}

function listEnv(name: string) {
  return textEnv(name)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function positiveDays(name: string, fallback: number) {
  const value = Number(textEnv(name));
  return Number.isInteger(value) && value >= 0 && value <= 3650 ? value : fallback;
}

function configuredDays(name: string) {
  const value = Number(textEnv(name));
  return Number.isInteger(value) && value >= 0 && value <= 3650;
}

export function getAnalyticsConfig(): AnalyticsConfig {
  const productionRuntime = process.env.NODE_ENV === "production";
  const privacyContact = textEnv("ANALYTICS_PRIVACY_CONTACT");
  const jurisdictions = listEnv("ANALYTICS_JURISDICTIONS");
  const analyticsSystem = textEnv("ANALYTICS_SYSTEM");
  const dataCategories = listEnv("ANALYTICS_DATA_CATEGORIES");
  const supervisorEmployeeIds = listEnv("ANALYTICS_SUPERVISOR_EMPLOYEE_IDS");
  const serviceProviderContracts = textEnv("ANALYTICS_SERVICE_PROVIDER_CONTRACTS");
  const breachResponseContacts = textEnv("ANALYTICS_BREACH_RESPONSE_CONTACTS");
  const childrenPrivacySetting = textEnv("ANALYTICS_CHILDREN_PRIVACY_SETTING");
  const geolocationSetting = textEnv("ANALYTICS_GEOLOCATION_SETTING");
  const ageRangeSetting = textEnv("ANALYTICS_AGE_RANGE_SETTING");
  const securityControlsReviewed = boolEnv("ANALYTICS_SECURITY_CONTROLS_REVIEWED");
  const healthInformationExclusionsReviewed = boolEnv(
    "ANALYTICS_HEALTH_INFORMATION_EXCLUSIONS_REVIEWED",
  );
  const consentSettingsReviewed = boolEnv("ANALYTICS_CONSENT_SETTINGS_REVIEWED");
  const legalReviewApproved = boolEnv("ANALYTICS_LEGAL_REVIEW_APPROVED");
  const productionEnabled = boolEnv("ANALYTICS_PRODUCTION_ENABLED");
  const developmentEnabled = boolEnv("ANALYTICS_DEVELOPMENT_ENABLED");
  const developmentMemoryStore =
    !productionRuntime && boolEnv("ANALYTICS_DEVELOPMENT_MEMORY_STORE");
  const hasDatabase = Boolean(textEnv("DATABASE_URL"));
  const hasHashKey = Boolean(
    textEnv("ANALYTICS_HASH_KEY") ||
      textEnv("LOUNGE_ENCRYPTION_KEY") ||
      textEnv("ADMIN_PASSWORD"),
  );
  const hasSecurityEncryptionKey = Boolean(
    textEnv("ANALYTICS_SECURITY_ENCRYPTION_KEY"),
  );

  const retention: RetentionConfig = {
    securityDays: positiveDays("ANALYTICS_RETENTION_SECURITY_DAYS", 30),
    eventDays: positiveDays("ANALYTICS_RETENTION_EVENT_DAYS", 90),
    recurringVisitorDays: positiveDays("ANALYTICS_RETENTION_VISITOR_DAYS", 180),
    geographyDays: positiveDays("ANALYTICS_RETENTION_GEOGRAPHY_DAYS", 90),
    ageSurveyDays: positiveDays("ANALYTICS_RETENTION_AGE_SURVEY_DAYS", 0),
    preciseLocationDays: positiveDays("ANALYTICS_RETENTION_PRECISE_LOCATION_DAYS", 0),
    restrictedDocumentAuditDays: positiveDays(
      "ANALYTICS_RETENTION_RESTRICTED_DOCUMENT_AUDIT_DAYS",
      365,
    ),
    requestPdfDays: positiveDays("ANALYTICS_RETENTION_REQUEST_PDF_DAYS", 365),
    administratorActionDays: positiveDays(
      "ANALYTICS_RETENTION_ADMIN_ACTION_DAYS",
      365,
    ),
    incidentHoldDays: positiveDays("ANALYTICS_RETENTION_INCIDENT_HOLD_DAYS", 30),
    consentDays: positiveDays("ANALYTICS_RETENTION_CONSENT_DAYS", 365),
  };

  const required: Array<[string, boolean]> = [
    ["ANALYTICS_PRIVACY_CONTACT", Boolean(privacyContact)],
    ["ANALYTICS_JURISDICTIONS", jurisdictions.length > 0],
    ["ANALYTICS_SYSTEM", Boolean(analyticsSystem)],
    ["ANALYTICS_DATA_CATEGORIES", dataCategories.length > 0],
    ["ANALYTICS_SUPERVISOR_EMPLOYEE_IDS", supervisorEmployeeIds.length > 0],
    ["ANALYTICS_SERVICE_PROVIDER_CONTRACTS", Boolean(serviceProviderContracts)],
    ["ANALYTICS_SECURITY_CONTROLS_REVIEWED", securityControlsReviewed],
    ["ANALYTICS_BREACH_RESPONSE_CONTACTS", Boolean(breachResponseContacts)],
    ["ANALYTICS_CHILDREN_PRIVACY_SETTING", Boolean(childrenPrivacySetting)],
    ["ANALYTICS_HEALTH_INFORMATION_EXCLUSIONS_REVIEWED", healthInformationExclusionsReviewed],
    ["ANALYTICS_GEOLOCATION_SETTING", Boolean(geolocationSetting)],
    ["ANALYTICS_AGE_RANGE_SETTING", Boolean(ageRangeSetting)],
    ["ANALYTICS_CONSENT_SETTINGS_REVIEWED", consentSettingsReviewed],
    ["ANALYTICS_LEGAL_REVIEW_APPROVED", legalReviewApproved],
    ["ANALYTICS_ROLE_CONFIGURATION_REVIEWED", boolEnv("ANALYTICS_ROLE_CONFIGURATION_REVIEWED")],
    ["ANALYTICS_RETENTION_DELETION_REVIEWED", boolEnv("ANALYTICS_RETENTION_DELETION_REVIEWED")],
    ["ANALYTICS_BACKUP_CONTROLS_REVIEWED", boolEnv("ANALYTICS_BACKUP_CONTROLS_REVIEWED")],
    ["ANALYTICS_INCIDENT_RESPONSE_DOCUMENTED", boolEnv("ANALYTICS_INCIDENT_RESPONSE_DOCUMENTED")],
    ["ANALYTICS_RETENTION_SECURITY_DAYS", configuredDays("ANALYTICS_RETENTION_SECURITY_DAYS")],
    ["ANALYTICS_RETENTION_EVENT_DAYS", configuredDays("ANALYTICS_RETENTION_EVENT_DAYS")],
    ["ANALYTICS_RETENTION_VISITOR_DAYS", configuredDays("ANALYTICS_RETENTION_VISITOR_DAYS")],
    ["ANALYTICS_RETENTION_GEOGRAPHY_DAYS", configuredDays("ANALYTICS_RETENTION_GEOGRAPHY_DAYS")],
    ["ANALYTICS_RETENTION_AGE_SURVEY_DAYS", configuredDays("ANALYTICS_RETENTION_AGE_SURVEY_DAYS")],
    ["ANALYTICS_RETENTION_PRECISE_LOCATION_DAYS", configuredDays("ANALYTICS_RETENTION_PRECISE_LOCATION_DAYS")],
    ["ANALYTICS_RETENTION_RESTRICTED_DOCUMENT_AUDIT_DAYS", configuredDays("ANALYTICS_RETENTION_RESTRICTED_DOCUMENT_AUDIT_DAYS")],
    ["ANALYTICS_RETENTION_REQUEST_PDF_DAYS", configuredDays("ANALYTICS_RETENTION_REQUEST_PDF_DAYS")],
    ["ANALYTICS_RETENTION_ADMIN_ACTION_DAYS", configuredDays("ANALYTICS_RETENTION_ADMIN_ACTION_DAYS")],
    ["ANALYTICS_RETENTION_INCIDENT_HOLD_DAYS", configuredDays("ANALYTICS_RETENTION_INCIDENT_HOLD_DAYS")],
    ["ANALYTICS_RETENTION_CONSENT_DAYS", configuredDays("ANALYTICS_RETENTION_CONSENT_DAYS")],
    ["ANALYTICS_HASH_KEY", hasHashKey],
    ["ANALYTICS_SECURITY_ENCRYPTION_KEY", hasSecurityEncryptionKey],
    ["DATABASE_URL", hasDatabase || developmentMemoryStore],
  ];
  const missingConfiguration = required.filter(([, ok]) => !ok).map(([name]) => name);
  const runtimeGate = productionRuntime ? productionEnabled : developmentEnabled;
  const optionalAnalyticsEnabled = runtimeGate && missingConfiguration.length === 0;

  return {
    productionRuntime,
    mode: optionalAnalyticsEnabled ? "optional" : "limited",
    optionalAnalyticsEnabled,
    developmentMemoryStore,
    privacyContact,
    jurisdictions,
    analyticsSystem,
    dataCategories,
    supervisorEmployeeIds,
    serviceProviderContracts,
    securityControlsReviewed,
    breachResponseContacts,
    childrenPrivacySetting,
    healthInformationExclusionsReviewed,
    geolocationSetting,
    ageRangeSetting,
    consentSettingsReviewed,
    legalReviewApproved,
    preciseLocationEnabled: false,
    communitySurveyEnabled:
      optionalAnalyticsEnabled && boolEnv("ANALYTICS_COMMUNITY_SURVEY_ENABLED"),
    consentVersion: textEnv("ANALYTICS_CONSENT_VERSION") || ANALYTICS_CONSENT_VERSION,
    minimumGroupSize: Math.max(
      15,
      Math.min(1000, Math.floor(Number(textEnv("ANALYTICS_MINIMUM_GROUP_SIZE")) || 15)),
    ),
    retention,
    missingConfiguration,
  };
}

export function publicAnalyticsConfiguration() {
  const config = getAnalyticsConfig();
  return {
    mode: config.mode,
    optionalAnalyticsEnabled: config.optionalAnalyticsEnabled,
    consentVersion: config.consentVersion,
    communitySurveyEnabled: config.communitySurveyEnabled,
    preciseLocationEnabled: false,
    privacyContactConfigured: Boolean(config.privacyContact),
  };
}
