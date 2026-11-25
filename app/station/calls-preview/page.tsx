import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { isStationAuthed, stationReviewBypass } from "@/lib/station/auth";
import { getSeasonalThemePublicConfig } from "@/lib/seasonal/themes";
import { STATION_FLAG_SCRIPT } from "@/lib/station/flags";
import CallsPreview from "./CallsPreview";

export const metadata: Metadata = {
  title: "Station CAD preview",
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
};

// Development harness for the station TV's live-call panel (components/station/StationCalls): the
// panel alone, at TV size, where it will sit over the village. Never served in production.
//   ?mode=demo   one synthetic call      ?mode=demo3 (default) three calls      ?mode=live  the real feed
//   ?frame=village (default: placeholders for the bar and living room, the panel where the village is)
//   ?frame=station (the real station TV, the panel laid over its village) | full (the panel alone)
// Sign in at /station/login first, or add ?station-review=1 when the dev server runs with
// STATION_REVIEW_BYPASS=1 (localhost only).
export default async function CallsPreviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const query = await searchParams;
  const review = stationReviewBypass(query, (await headers()).get("host"));
  if (!review && !(await isStationAuthed())) {
    return (
      <p style={{ padding: 32, font: "600 18px/1.5 system-ui, sans-serif", color: "#e2e8f0" }}>
        Sign in at <a href="/station/login" style={{ color: "#93c5fd" }}>/station/login</a> first, or open this page with
        ?station-review=1 while the dev server runs with STATION_REVIEW_BYPASS=1.
      </p>
    );
  }
  const mode = query.mode === "live" ? null : query.mode === "demo" ? "demo" : "demo3";
  const frame = query.frame === "full" ? "full" : query.frame === "station" ? "station" : "village";
  if (frame === "station") {
    return (<>
      <script dangerouslySetInnerHTML={{ __html: STATION_FLAG_SCRIPT }} />
      <CallsPreview mode={mode} frame={frame} initialWinter={getSeasonalThemePublicConfig().initialTheme === "winter"} />
    </>);
  }
  return <CallsPreview mode={mode} frame={frame} />;
}
