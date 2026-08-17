import { publicFeatureStatus, publicVerifiedDataStatus } from "@/lib/feature-flags/public-features";

export type SkyFeature = {
  title: string;
  timing: string;
  detail: string;
  safetyNote?: string;
};

export function getMillstadtSkyFeatures(): SkyFeature[] {
  const enabled = publicFeatureStatus("astronomy") === "enabled";
  const verified = publicVerifiedDataStatus("astronomy") === "verified";

  if (!enabled || !verified) {
    return [
      {
        title: "Moon and planet watch",
        timing: enabled ? "Source review staged" : "Curated preview",
        detail:
          "A future source-aware sky adapter can surface only the events that are genuinely visible from Millstadt.",
      },
      {
        title: "Meteor shower nights",
        timing: "Seasonal preview",
        detail:
          "The public page is ready for verified dates, direction, timing, and weather caveats once sources are wired.",
      },
      {
        title: "Solar safety",
        timing: "Always-on guidance",
        detail:
          "Solar events will require reviewed eye-safety language before they can appear as active public items.",
        safetyNote: "Never look directly at the Sun without certified solar viewing protection.",
      },
    ];
  }

  return [
    {
      title: "Millstadt Sky",
      timing: "Verified sky data",
      detail:
        "Verified sky events can appear when the adapter returns visibility, direction, timing, and safety details.",
    },
  ];
}
