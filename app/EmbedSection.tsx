"use client";

import { useState } from "react";

const code = `<iframe src="https://millstadtems.org" width="100%" height="650" frameborder="0" style="border-radius:12px;" title="Millstadt EMS"></iframe>`;

export default function EmbedSection() {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="pb-28 bg-[#040d1a]">
      <div className="wrap">
        <div className="flex items-center gap-3 mb-4">
          <span className="h-px w-8 bg-[#f0b429]" />
          <span className="text-[#f0b429] text-sm font-black tracking-[0.25em] uppercase">For Partners</span>
        </div>
        <h2 className="text-4xl font-black text-white mb-3">Embed Our Website</h2>
        <p className="text-slate-400 text-lg mb-10 max-w-2xl leading-relaxed">
          Add Millstadt EMS to your website or community board with a single snippet.
        </p>

        <div className="rounded-2xl overflow-hidden border border-white/8 bg-[#071428]">
          {/* Top bar */}
          <div className="flex items-center justify-between gap-4 px-8 py-5 border-b border-white/8">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-white/10" />
              <span className="w-2 h-2 rounded-full bg-white/10" />
              <span className="w-2 h-2 rounded-full bg-white/10" />
              <span className="text-slate-600 text-xs font-mono ml-2">embed.html</span>
            </div>
            <button
              onClick={copy}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-black text-sm transition-all duration-200 ${
                copied
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-[#f0b429] hover:bg-[#d9a320] text-[#040d1a]"
              }`}
            >
              {copied ? (
                <>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" /></svg>
                  Copy Code
                </>
              )}
            </button>
          </div>

          {/* Code */}
          <div className="px-8 py-8 bg-[#020912]">
            <pre className="text-base text-slate-300 font-mono leading-relaxed whitespace-pre-wrap break-all">{code}</pre>
          </div>
        </div>
      </div>
    </section>
  );
}
