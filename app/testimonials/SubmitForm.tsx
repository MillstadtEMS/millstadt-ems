"use client";

import { useActionState, useState } from "react";
import { submitTestimonial } from "./actions";
import { Section, SectionHeader, Label, Input, Textarea } from "@/components/forms/VillaStyle";

export default function SubmitForm() {
  const [state, action, pending] = useActionState(submitTestimonial, null);
  const [anonymous, setAnonymous] = useState(false);
  const [chars, setChars] = useState(0);

  if (state && "success" in state) {
    return (
      <div
        className="p-12 text-center"
        style={{ background: "#111111", border: "1px solid rgba(52,211,153,0.3)", borderLeft: "4px solid #34d399" }}
      >
        <div className="text-[#34d399] text-5xl font-black mb-4">✓</div>
        <h3 className="text-white font-black text-2xl uppercase tracking-wide mb-3">Thank You</h3>
        <p className="text-slate-400 text-base leading-relaxed">
          Your testimonial has been submitted for review. We appreciate you sharing your experience with us.
        </p>
      </div>
    );
  }

  return (
    <form action={action}>
      <Section>
        <SectionHeader number="1" title="Share Your Experience" subtitle="Tell us about your experience with Millstadt EMS." />

        <label className="flex items-center gap-3 cursor-pointer w-fit mb-8">
          <div className="relative">
            <input
              type="checkbox"
              name="anonymous"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-white/10 peer-checked:bg-[#f0b429] transition-colors" />
            <div className="absolute top-1 left-1 w-4 h-4 bg-white transition-transform peer-checked:translate-x-5" />
          </div>
          <span className="text-slate-300 text-sm font-bold uppercase tracking-widest select-none">Submit anonymously</span>
        </label>

        {!anonymous && (
          <div className="mb-6">
            <Label>Your Name (optional)</Label>
            <Input name="name" placeholder="John Doe" maxLength={80} />
          </div>
        )}

        <div>
          <Label required>Your Experience</Label>
          <Textarea
            name="message"
            required
            rows={7}
            maxLength={1000}
            placeholder="Tell us about your experience with Millstadt EMS..."
            onChange={(e) => setChars(e.target.value.length)}
          />
          <div className="flex items-center justify-between mt-2">
            {state && "error" in state ? (
              <span className="text-red-400 text-xs">{state.error}</span>
            ) : (
              <span className="text-slate-600 text-xs">Minimum 15 characters</span>
            )}
            <span className={`text-xs font-bold ${chars > 900 ? "text-amber-400" : "text-slate-600"}`}>
              {chars} / 1000
            </span>
          </div>
        </div>
      </Section>

      <button
        type="submit"
        disabled={pending}
        className="w-full py-4 bg-[#f0b429] hover:bg-[#d9a320] disabled:opacity-60 disabled:cursor-not-allowed text-[#040d1a] font-black text-sm uppercase tracking-widest transition-colors"
      >
        {pending ? "Submitting…" : "Submit Testimonial"}
      </button>

      <p className="text-slate-600 text-xs text-center leading-relaxed mt-6">
        All submissions are reviewed before being published. By submitting you agree to let us display your testimonial on this site.
      </p>
    </form>
  );
}
