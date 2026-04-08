import type { Metadata } from "next";
import { getApproved } from "@/lib/testimonials";
import SubmitForm from "./SubmitForm";
import EmptyState from "./EmptyState";

export const metadata: Metadata = {
  title: "Testimonials",
  description: "Read what the Millstadt community has to say about Millstadt Ambulance Service.",
};

export const revalidate = 60;

function QuoteIcon() {
  return (
    <svg viewBox="0 0 32 32" className="w-7 h-7 fill-current text-[#f0b429]/30" aria-hidden>
      <path d="M10 8C6.686 8 4 10.686 4 14v10h10V14H7c0-1.654 1.346-3 3-3V8zm14 0c-3.314 0-6 2.686-6 6v10h10V14h-7c0-1.654 1.346-3 3-3V8z" />
    </svg>
  );
}

export default async function TestimonialsPage() {
  const testimonials = await getApproved();

  return (
    <>
      {/* Page Header */}
      <section className="relative pt-16 pb-28 bg-[#040d1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b429]/30 to-transparent" />
        <div className="relative wrap">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">From Our Community</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6">
            Testimonials
          </h1>
          <p className="text-slate-400 text-xl">Real stories from the people we serve in Millstadt.</p>
        </div>
      </section>

      {/* Testimonials area */}
      <section className="pb-24 bg-[#040d1a]">
        <div className="wrap">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-8 bg-[#f0b429]" />
            <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Community Reviews</span>
          </div>

          {/* Defined container */}
          <div className="rounded-2xl border border-white/8 bg-[#071428] min-h-[420px] p-10 flex items-center justify-center">
            {testimonials.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {testimonials.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-2xl bg-[#040d1a] border border-white/8 p-8 flex flex-col gap-5"
                  >
                    <QuoteIcon />
                    <p className="text-slate-300 text-base leading-relaxed flex-1 italic">
                      &ldquo;{t.message}&rdquo;
                    </p>
                    <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                      <div className="w-8 h-8 rounded-full bg-[#1a3a6e]/60 border border-[#2563eb]/20 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-[#2563eb]">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-white font-bold text-sm">
                          {t.anonymous || !t.name ? "Anonymous" : t.name}
                        </div>
                        <div className="text-slate-600 text-xs">
                          {new Date(t.submittedAt).toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Submit form */}
      <section className="py-24 bg-[#071428] border-t border-white/5">
        <div className="wrap">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-px w-8 bg-[#f0b429]" />
              <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">Share Your Story</span>
            </div>
            <h2 className="text-4xl font-black text-white mb-3">Write a Testimonial</h2>
            <p className="text-slate-400 text-base leading-relaxed mb-10">
              Did Millstadt EMS respond to your call? Were you at an event we attended? We&apos;d love to hear about your experience.
            </p>
            <SubmitForm />
          </div>
        </div>
      </section>

      <div className="h-20 bg-gradient-to-b from-[#071428] to-[#040d1a]" />
    </>
  );
}
