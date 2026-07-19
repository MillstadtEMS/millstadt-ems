import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicMetric, PublicPageHero } from "@/components/site/PublicChrome";
import { getPublicMinutes } from "@/lib/board/governance";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "EMS Board Minutes",
  description: "Published Millstadt EMS Board meeting minutes.",
};

function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function PublicBoardMinutesPage() {
  const minutes = await getPublicMinutes();
  if (minutes.length === 0) notFound();

  return (
    <>
      <PublicPageHero
        eyebrow="Governance"
        title="EMS Board"
        accent="Minutes"
        description="Meeting minutes shared by the Millstadt EMS Board."
      >
        <PublicMetric label="Published meetings" value={minutes.length} tone="gold" />
      </PublicPageHero>

      <section className="py-16 bg-[#040d1a]">
        <div className="wrap" style={{ display: "grid", gap: 18 }}>
          {minutes.map((item) => (
            <article key={item.id} className="rounded-xl border border-white/10 bg-[#071428] p-6 shadow-xl shadow-black/20">
              <div className="text-[#f0b429] text-xs font-black uppercase tracking-[0.2em]">
                {fmtDate(item.date)}{item.startTime ? ` · ${item.startTime}` : ""}
              </div>
              <h2 className="mt-2 text-2xl font-black text-white">{item.title ?? "Regular EMS Board Meeting"}</h2>
              <div className="mt-5 whitespace-pre-wrap text-slate-300 leading-7">{item.minutesText}</div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
