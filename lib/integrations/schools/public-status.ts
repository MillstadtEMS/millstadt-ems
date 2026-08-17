import { publicFeatureStatus, publicVerifiedDataStatus } from "@/lib/feature-flags/public-features";

export type SchoolEventSourceStatus = {
  name: string;
  status: "setup-required" | "source-staged" | "verified-data";
  statusLabel: string;
  note: string;
};

const schoolSources = [
  "Millstadt Consolidated School / CCSD 160",
  "St. James Catholic School in Millstadt",
  "Belleville Township High School West",
];

export function getSchoolEventStatus(): SchoolEventSourceStatus[] {
  const visible = publicFeatureStatus("schoolEvents") === "enabled";
  const verified = publicVerifiedDataStatus("schoolEvents") === "verified";
  const status = verified ? "verified-data" : visible ? "source-staged" : "setup-required";

  return schoolSources.map((name) => ({
    name,
    status,
    statusLabel:
      status === "verified-data"
        ? "Verified feed ready"
        : status === "source-staged"
          ? "Source review staged"
          : "Official calendar source required",
    note:
      status === "verified-data"
        ? "Approved event data can appear after source timestamp and review checks pass."
        : "Sports, event, and closure items stay hidden until an official calendar, athletics feed, or approved manual source is connected.",
  }));
}
