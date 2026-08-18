export const SEASONAL_THEME_IDS = [
  "normal",
  "halloween",
  "thanksgiving",
  "winter",
  "veterans-day",
  "memorial-day",
  "independence-day",
] as const;

export type SeasonalThemeId = (typeof SEASONAL_THEME_IDS)[number];

export type SeasonalThemeWindow = {
  id: Exclude<SeasonalThemeId, "normal">;
  startsAt: string;
  endsAt: string;
  enabled: boolean;
};

export type SeasonalThemePublicConfig = {
  disabled: boolean;
  override: SeasonalThemeId | null;
  windows: SeasonalThemeWindow[];
  initialTheme: SeasonalThemeId;
};

const LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const themeSet = new Set<string>(SEASONAL_THEME_IDS);
const chicagoDateTime = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Chicago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function isSeasonalThemeId(value: unknown): value is SeasonalThemeId {
  return typeof value === "string" && themeSet.has(value);
}

export function chicagoDateTimeKey(date = new Date()) {
  const parts = chicagoDateTime.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function parseSeasonalThemeWindows(raw: string | undefined) {
  if (!raw?.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 24).flatMap<SeasonalThemeWindow>((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const item = entry as Record<string, unknown>;
      if (
        !isSeasonalThemeId(item.id) ||
        item.id === "normal" ||
        typeof item.startsAt !== "string" ||
        typeof item.endsAt !== "string" ||
        !LOCAL_DATE_TIME.test(item.startsAt) ||
        !LOCAL_DATE_TIME.test(item.endsAt) ||
        item.startsAt > item.endsAt
      ) {
        return [];
      }
      return [{
        id: item.id,
        startsAt: item.startsAt,
        endsAt: item.endsAt,
        enabled: item.enabled !== false,
      }];
    });
  } catch {
    return [];
  }
}

export function resolveSeasonalTheme({
  now = new Date(),
  disabled = false,
  override = null,
  windows = [],
}: {
  now?: Date;
  disabled?: boolean;
  override?: SeasonalThemeId | null;
  windows?: SeasonalThemeWindow[];
}): SeasonalThemeId {
  if (disabled) return "normal";
  if (override) return override;
  const localNow = chicagoDateTimeKey(now);
  return windows.find((window) =>
    window.enabled && localNow >= window.startsAt && localNow <= window.endsAt,
  )?.id ?? "normal";
}

export function getSeasonalThemePublicConfig(): SeasonalThemePublicConfig {
  const disabled = process.env.DISABLE_PUBLIC_SEASONAL_THEMES === "true";
  const override = isSeasonalThemeId(process.env.PUBLIC_SEASONAL_THEME_OVERRIDE)
    ? process.env.PUBLIC_SEASONAL_THEME_OVERRIDE
    : null;
  const windows = parseSeasonalThemeWindows(process.env.PUBLIC_SEASONAL_THEMES_JSON);
  return {
    disabled,
    override,
    windows,
    initialTheme: resolveSeasonalTheme({ disabled, override, windows }),
  };
}
