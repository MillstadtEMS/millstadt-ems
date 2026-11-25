import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import StationTV from "@/components/station/StationTV";
import { isStationAuthed, safeStationPath, stationReviewBypass } from "@/lib/station/auth";
import { getSeasonalThemePublicConfig } from "@/lib/seasonal/themes";

export const metadata: Metadata = {
  title: "Station TV",
  description: "The Millstadt EMS station TV: the Christmas lights, the living room and the village, with the time, weather and countdown.",
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
};

export const viewport: Viewport = { themeColor: "#050b18" };

// The station TV (smart TV browsers, a Fire Stick, the Chief 360 dashboard): one screen, hands-free,
// signed in with the station password (lib/station/auth).
export default async function StationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const host = (await headers()).get("host");
  const review = stationReviewBypass(query, host);
  if (!review && !(await isStationAuthed())) {
    const back = new URLSearchParams();
    for (const [name, value] of Object.entries(query)) if (typeof value === "string") back.set(name, value);
    const next = safeStationPath(`/station${back.size ? `?${back}` : ""}`);
    redirect(`/station/login?next=${encodeURIComponent(next)}`);
  }
  return (
    <StationTV
      initialWinter={getSeasonalThemePublicConfig().initialTheme === "winter"}
      driveBy={process.env.ENABLE_PUBLIC_AMBULANCE_DRIVE_BY !== "false"}
      review={review}
    />
  );
}
