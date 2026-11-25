import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import StationTV from "@/components/station/StationTV";
import StationRetry from "@/components/station/StationRetry";
import { safeStationPath, stationAuthState, stationReviewBypass } from "@/lib/station/auth";
import { getSeasonalThemePublicConfig } from "@/lib/seasonal/themes";
import { STATION_FLAG_SCRIPT } from "@/lib/station/flags";

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
  const review = stationReviewBypass(query, (await headers()).get("host"));
  if (!review) {
    const state = await stationAuthState();
    // The password store didn't answer: keep the TV on a calm screen that tries again, instead of
    // dropping it on the sign-in page where nobody is standing by to type.
    if (state === "unavailable") return <StationRetry />;
    if (state === "signed-out") {
      const back = new URLSearchParams();
      for (const [name, value] of Object.entries(query)) if (typeof value === "string") back.set(name, value);
      const next = safeStationPath(`/station${back.size ? `?${back}` : ""}`);
      redirect(`/station/login?next=${encodeURIComponent(next)}`);
    }
  }
  return (<>
    {/* Tell the shared seasonal code it's on the TV (Time Out is ignored, the crew fall with mad
        faces) before React hydrates; the station marks html[data-station] itself once it has. */}
    <script dangerouslySetInnerHTML={{ __html: STATION_FLAG_SCRIPT }} />
    <StationTV
      initialWinter={getSeasonalThemePublicConfig().initialTheme === "winter"}
      driveBy={process.env.ENABLE_PUBLIC_AMBULANCE_DRIVE_BY !== "false"}
      review={review}
    />
  </>);
}
