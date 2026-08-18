const enabled = (key: string) => process.env[key] === "true";

export const publicFeatureFlags = {
  professionalSports: enabled("ENABLE_PUBLIC_PRO_SPORTS"),
  schoolEvents: enabled("ENABLE_PUBLIC_SCHOOL_EVENTS"),
  flagStatus: enabled("ENABLE_PUBLIC_FLAG_STATUS"),
  astronomy: enabled("ENABLE_PUBLIC_ASTRONOMY"),
};

export const publicVerifiedDataFlags = {
  professionalSports: enabled("ENABLE_PUBLIC_PRO_SPORTS_VERIFIED"),
  schoolEvents: enabled("ENABLE_PUBLIC_SCHOOL_EVENTS_VERIFIED"),
  flagStatus: enabled("ENABLE_PUBLIC_FLAG_STATUS_VERIFIED"),
  astronomy: enabled("ENABLE_PUBLIC_ASTRONOMY_VERIFIED"),
};

export type PublicFeatureFlag = keyof typeof publicFeatureFlags;

export function publicFeatureStatus(flag: PublicFeatureFlag) {
  return publicFeatureFlags[flag] ? "enabled" : "setup-required";
}

export function publicVerifiedDataStatus(flag: PublicFeatureFlag) {
  return publicFeatureFlags[flag] && publicVerifiedDataFlags[flag] ? "verified" : "not-verified";
}
