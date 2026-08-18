"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, PhoneCall, Printer, ShieldCheck } from "lucide-react";
import { CALL_911_STEPS } from "@/lib/kids/call-911";

export default function Call911Story() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = CALL_911_STEPS[activeIndex];

  return (
    <section className="bg-white py-14 text-[#061121]" aria-labelledby="call-911-story-heading">
      <div className="wrap box-border">
        <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-[#1b58c9]">911 Story</div>
            <h2 id="call-911-story-heading" className="mt-4 text-4xl font-black leading-tight md:text-5xl">
              What happens when you call 911?
            </h2>
            <p className="mt-5 max-w-xl text-lg font-semibold leading-8 text-slate-700">
              Walk through the basic steps with a grown-up. Every emergency is different, but dispatchers will ask questions and send the right available help.
            </p>
            <Link
              href="/kids-club/printables/911-call-guide"
              className="mt-7 inline-flex min-h-12 items-center gap-2 border-2 border-[#061121] px-5 text-sm font-black text-[#061121] hover:bg-[#f0b429] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b58c9]"
            >
              <Printer className="h-4 w-4" aria-hidden /> Print the family guide
            </Link>
          </div>

          <div className="border border-slate-200 bg-[#f4f8fb] p-5 md:p-7">
            <ol className="grid grid-cols-4 gap-2 sm:grid-cols-8" aria-label="911 call steps">
              {CALL_911_STEPS.map((step, index) => (
                <li key={step.title}>
                  <button
                    type="button"
                    aria-current={index === activeIndex ? "step" : undefined}
                    onClick={() => setActiveIndex(index)}
                    className={`flex min-h-14 w-full flex-col items-center justify-center border px-1 text-center text-[10px] font-black uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b58c9] ${index === activeIndex ? "border-[#1b58c9] bg-[#1b58c9] text-white" : "border-slate-300 bg-white text-slate-700 hover:border-[#1b58c9]"}`}
                  >
                    <span className="font-mono text-xs" aria-hidden>{index + 1}</span>
                    <span className="mt-1">{step.shortTitle}</span>
                  </button>
                </li>
              ))}
            </ol>

            <div className="mt-6 min-h-[250px] border-l-4 border-[#f0b429] bg-white p-6" aria-live="polite">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center bg-[#061121] text-white">
                  {activeIndex === 2 ? <PhoneCall className="h-6 w-6" aria-hidden /> : <ShieldCheck className="h-6 w-6" aria-hidden />}
                </span>
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-[#1b58c9]">Step {activeIndex + 1}</div>
                  <h3 className="mt-2 text-2xl font-black leading-tight">{active.title}</h3>
                  <p className="mt-3 text-base font-semibold leading-7 text-slate-700">{active.body}</p>
                  {active.say ? (
                    <p className="mt-4 border-l-2 border-[#1b58c9] pl-4 text-lg font-black text-[#061121]">Say: &ldquo;{active.say}&rdquo;</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveIndex((current) => Math.max(0, current - 1))}
                disabled={activeIndex === 0}
                className="inline-flex min-h-12 items-center gap-2 border border-slate-300 bg-white px-5 font-black text-[#061121] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b58c9]"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden /> Previous
              </button>
              <button
                type="button"
                onClick={() => setActiveIndex((current) => Math.min(CALL_911_STEPS.length - 1, current + 1))}
                disabled={activeIndex === CALL_911_STEPS.length - 1}
                className="inline-flex min-h-12 items-center gap-2 bg-[#f0b429] px-5 font-black text-[#061121] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b58c9]"
              >
                Next <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
