const SUPPORTED_MODEL = "gpt-5.6-luna";

function textEnv(name: string) {
  return (process.env[name] ?? "").trim();
}

function boolEnv(name: string) {
  return textEnv(name).toLowerCase() === "true";
}

function boundedNumber(name: string, fallback: number, minimum: number, maximum: number) {
  const value = Number(textEnv(name));
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, value));
}

export type AiMonitorConfig = {
  enabled: boolean;
  weeklyAnalyticsEnabled: boolean;
  ready: boolean;
  missingConfiguration: string[];
  model: typeof SUPPORTED_MODEL;
  monthlyBudgetUsd: number;
  maxOutputTokens: number;
  reportRetentionDays: number;
  siteUrl: string;
};

export function getAiMonitorConfig(): AiMonitorConfig {
  const enabled = boolEnv("AI_MONITOR_ENABLED");
  const weeklyAnalyticsEnabled = boolEnv("AI_MONITOR_WEEKLY_ANALYTICS_ENABLED");
  const siteUrl = textEnv("AI_MONITOR_SITE_URL") || "https://www.millstadtems.org";
  const requestedModel = textEnv("AI_MONITOR_MODEL") || SUPPORTED_MODEL;
  const missingConfiguration = [
    ["OPENAI_API_KEY", Boolean(textEnv("OPENAI_API_KEY"))],
    ["DATABASE_URL", Boolean(textEnv("DATABASE_URL"))],
    ["CRON_SECRET", Boolean(textEnv("CRON_SECRET"))],
    ["AI_MONITOR_MODEL", requestedModel === SUPPORTED_MODEL],
  ]
    .filter(([, configured]) => !configured)
    .map(([name]) => String(name));

  return {
    enabled,
    weeklyAnalyticsEnabled,
    ready: enabled && missingConfiguration.length === 0,
    missingConfiguration,
    model: SUPPORTED_MODEL,
    monthlyBudgetUsd: boundedNumber("AI_MONITOR_MONTHLY_BUDGET_USD", 18, 1, 20),
    maxOutputTokens: Math.floor(boundedNumber("AI_MONITOR_MAX_OUTPUT_TOKENS", 900, 400, 1600)),
    reportRetentionDays: Math.floor(
      boundedNumber("AI_MONITOR_REPORT_RETENTION_DAYS", 35, 14, 90),
    ),
    siteUrl,
  };
}

export function publicAiMonitorConfiguration() {
  const config = getAiMonitorConfig();
  return {
    enabled: config.enabled,
    weeklyAnalyticsEnabled: config.weeklyAnalyticsEnabled,
    ready: config.ready,
    missingConfiguration: config.missingConfiguration,
    model: config.model,
    monthlyBudgetUsd: config.monthlyBudgetUsd,
    reportRetentionDays: config.reportRetentionDays,
    reportOnly: true,
  };
}
