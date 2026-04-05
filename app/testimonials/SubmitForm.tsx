"use client";

import { useActionState, useState } from "react";
import { submitTestimonial } from "./actions";

export default function SubmitForm() {
  const [state, action, pending] = useActionState(submitTestimonial, null);
  const [anonymous, setAnonymous] = useState(false);
  const [chars, setChars] = useState(0);

  if (state && "success" in state) {
    return (
      <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-10 py-14 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current text-emerald-400">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        </div>
        <h3 className="text-white font-black text-2xl mb-3">Thank You!</h3>
        <p className="text-slate-400 text-lg leading-relaxed">
          Your testimonial has been submitted for review. We appreciate you sharing your experience with us.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-8">

      {/* Anonymous toggle */}
      <label className="flex items-center gap-4 cursor-pointer w-fit">
        <div className="relative">
          <input
            type="checkbox"
            name="anonymous"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-12 h-7 rounded-full bg-white/10 peer-checked:bg-[#f0b429] transition-colors border border-white/15 peer-checked:border-[#f0b429]" />
          <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform peer-checked:translate-x-5 shadow" />
        </div>
        <span className="text-slate-300 text-base font-bold select-none">Submit anonymously</span>
      </label>

      {/* Name */}
      {!anonymous && (
        <div className="space-y-2">
          <label className="block text-sm font-black tracking-[0.15em] uppercase text-slate-400">
            Your Name <span className="text-slate-600 normal-case tracking-normal font-normal text-sm">(optional)</span>
          </label>
          <input
            type="text"
            name="name"
            placeholder="John Doe"
            maxLength={80}
            className="w-full bg-[#040d1a] border border-white/15 rounded-xl px-6 py-4 text-white placeholder-slate-600 text-lg focus:outline-none focus:border-[#f0b429]/50 transition-colors"
          />
        </div>
      )}

      {/* Message */}
      <div className="space-y-2">
        <label className="block text-sm font-black tracking-[0.15em] uppercase text-slate-400">
          Your Experience <span className="text-red-400">*</span>
        </label>
        <textarea
          name="message"
          required
          rows={7}
          maxLength={1000}
          placeholder="Tell us about your experience with Millstadt EMS..."
          onChange={(e) => setChars(e.target.value.length)}
          className="w-full bg-[#040d1a] border border-white/15 rounded-xl px-6 py-5 text-white placeholder-slate-600 text-lg focus:outline-none focus:border-[#f0b429]/50 transition-colors resize-none leading-relaxed"
        />
        <div className="flex items-center justify-between">
          {state && "error" in state ? (
            <span className="text-red-400 text-sm">{state.error}</span>
          ) : (
            <span className="text-slate-600 text-sm">Minimum 15 characters</span>
          )}
          <span className={`text-sm font-bold ${chars > 900 ? "text-amber-400" : "text-slate-600"}`}>
            {chars} / 1000
          </span>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-3 w-full py-6 bg-[#f0b429] hover:bg-[#d9a320] disabled:opacity-50 disabled:cursor-not-allowed text-[#040d1a] font-black text-xl rounded-2xl transition-colors"
      >
        {pending ? (
          <>
            <span className="w-5 h-5 rounded-full border-2 border-[#040d1a]/30 border-t-[#040d1a] animate-spin" />
            Submitting…
          </>
        ) : "Submit Testimonial"}
      </button>

      <p className="text-slate-600 text-sm text-center leading-relaxed">
        All submissions are reviewed before being published. By submitting you agree to let us display your testimonial on this site.
      </p>

    </form>
  );
}
