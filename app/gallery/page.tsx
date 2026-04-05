import type { Metadata } from "next";
import GalleryGrid from "./GalleryGrid";

export const metadata: Metadata = {
  title: "Photo Gallery",
  description:
    "Photos from Millstadt Ambulance Service — our crew, our units, and our community.",
};

export default function GalleryPage() {
  return (
    <>
      {/* Page Header */}
      <section className="relative pt-16 pb-24 bg-[#040d1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b429]/30 to-transparent" />
        <div className="relative wrap">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Millstadt EMS</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6">
            Photo Gallery
          </h1>
          <p className="text-slate-400 text-xl max-w-2xl leading-relaxed">
            A look at who we are — on the job, in the community,<br />
            and everything in between.
          </p>
        </div>
      </section>

      {/* Gallery */}
      <section className="pb-40 bg-[#040d1a]">
        <div className="wrap">
          <GalleryGrid />
        </div>
      </section>

      <div className="h-20 bg-[#040d1a]" />
    </>
  );
}
