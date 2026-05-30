import type { Metadata } from "next";
import GalleryGrid from "./GalleryGrid";
import { PublicMetric, PublicPageHero } from "@/components/site/PublicChrome";

export const metadata: Metadata = {
  title: "Photo Gallery",
  description:
    "Photos from Millstadt Ambulance Service — our crew, our units, and our community.",
};

export default function GalleryPage() {
  return (
    <>
      <PublicPageHero
        eyebrow="Millstadt EMS"
        title="Photo"
        accent="Gallery"
        description="Real moments from the crew, the station, the fleet, and the community we serve."
      >
        <PublicMetric label="Local identity" value="Real" tone="gold" />
        <PublicMetric label="Crew moments" value="Live" tone="cyan" />
      </PublicPageHero>

      {/* Gallery */}
      <section className="bg-[#040d1a]" style={{ paddingBottom: 24 }}>
        <div className="wrap">
          <GalleryGrid />
        </div>
      </section>

      <div className="h-20 bg-[#040d1a]" />
    </>
  );
}
