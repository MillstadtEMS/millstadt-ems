import { publicFeatureStatus, publicVerifiedDataStatus } from "@/lib/feature-flags/public-features";

export type FlagJurisdictionStatus = {
  jurisdiction: "Federal" | "Illinois";
  state: "Full Staff" | "Half-Staff" | "Status Temporarily Unavailable" | "Needs Administrative Review";
  source: string;
  note: string;
};

export function getFlagStatus(): FlagJurisdictionStatus[] {
  const enabled = publicFeatureStatus("flagStatus") === "enabled";
  const verified = publicVerifiedDataStatus("flagStatus") === "verified";

  if (!enabled || !verified) {
    return [
      {
        jurisdiction: "Federal",
        state: "Status Temporarily Unavailable",
        source: enabled
          ? "Official federal half-staff source is being reviewed"
          : "Official federal half-staff notices are not connected yet",
        note: "No public half-staff claim is shown until an official source is configured.",
      },
      {
        jurisdiction: "Illinois",
        state: "Status Temporarily Unavailable",
        source: enabled
          ? "Official Illinois half-staff source is being reviewed"
          : "Official Illinois half-staff notices are not connected yet",
        note: "No Illinois flag-status claim is shown until an official source is configured.",
      },
    ];
  }

  return [
    {
      jurisdiction: "Federal",
      state: "Status Temporarily Unavailable",
      source: "Official federal source",
      note: "Source adapter is enabled but has not returned verified data.",
    },
    {
      jurisdiction: "Illinois",
      state: "Status Temporarily Unavailable",
      source: "Official Illinois source",
      note: "Source adapter is enabled but has not returned verified data.",
    },
  ];
}
