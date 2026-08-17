import { publicVerifiedDataStatus } from "@/lib/feature-flags/public-features";

export type SportsSourceStatus = {
  team: string;
  league: string;
  scheduleUrl: string;
  source: string;
  status: "setup-required" | "source-link" | "verified-data";
  note: string;
};

export function getProfessionalSportsStatus(): SportsSourceStatus[] {
  const verified = publicVerifiedDataStatus("professionalSports") === "verified";
  const status = verified ? "verified-data" : "source-link";

  return [
    {
      team: "St. Louis Cardinals",
      league: "MLB",
      scheduleUrl: "https://www.mlb.com/cardinals/schedule",
      source: "Official Cardinals schedule",
      status,
      note:
        status === "verified-data"
          ? "Verified schedule data can be displayed from the approved provider."
          : "Official schedule link is available; automated schedules and live scores stay off until provider approval is complete.",
    },
    {
      team: "St. Louis Blues",
      league: "NHL",
      scheduleUrl: "https://www.nhl.com/blues/schedule",
      source: "Official Blues schedule",
      status,
      note:
        status === "verified-data"
          ? "Verified schedule data can be displayed from the approved provider."
          : "Official schedule link is available; automated schedules and live scores stay off until provider approval is complete.",
    },
    {
      team: "St. Louis CITY SC",
      league: "MLS",
      scheduleUrl: "https://www.stlcitysc.com/schedule/matches",
      source: "Official St. Louis CITY SC schedule",
      status,
      note:
        status === "verified-data"
          ? "Verified schedule data can be displayed from the approved provider."
          : "Official schedule link is available; automated schedules and live scores stay off until provider approval is complete.",
    },
  ];
}
