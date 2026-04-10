"use client";

import { useState } from "react";

export default function BudgetDocumentsAdmin() {
  const [viewing, setViewing] = useState(false);

  if (viewing) {
    return (
      <div className="fixed inset-0 z-[300] bg-white flex flex-col">
        <div className="bg-[#0f1b2d] px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-[#f0b429]">
              <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zm-2-8H8v-2h8v2zm0 4H8v-2h8v2z"/>
            </svg>
            <span className="text-white font-bold text-sm">
              Draft Annual Budget &amp; Strategic Overview — FY 2025–2026
            </span>
            <span className="text-[#f0b429] text-xs font-black tracking-widest uppercase ml-2 bg-[#f0b429]/10 px-2 py-0.5 rounded">
              DRAFT
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/_internal/budget-draft/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white text-xs font-bold transition-colors"
            >
              Open in New Tab ↗
            </a>
            <button
              onClick={() => setViewing(false)}
              className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-1.5 rounded-lg text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
        <iframe
          src="/_internal/budget-draft/index.html"
          className="flex-1 w-full border-none"
          title="Budget Document"
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="h-px w-8 bg-[#f0b429]" />
          <span className="text-[#f0b429] text-xs font-black tracking-[0.25em] uppercase">
            Internal Documents
          </span>
        </div>
        <h1 className="text-3xl font-black text-white">
          Draft Annual Budget &amp; Strategic Overview
        </h1>
        <p className="text-slate-400 text-sm mt-1.5">
          FY 2025–2026 (May 1, 2025 — April 30, 2026). This document is only visible
          in the admin panel and is <strong className="text-slate-300">not published</strong> on
          the public website.
        </p>
      </div>

      {/* Document card */}
      <div className="bg-[#071428] border border-white/10 rounded-2xl p-7 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-xl bg-[#f0b429]/10 border border-[#f0b429]/20 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current text-[#f0b429]">
              <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zm-2-8H8v-2h8v2zm0 4H8v-2h8v2z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-black text-lg mb-1">
              Millstadt Ambulance Service
            </h2>
            <p className="text-slate-400 text-sm mb-1">
              Annual Budget &amp; Strategic Overview — Fiscal Year 2025–2026
            </p>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-[#f0b429] text-xs font-black tracking-widest uppercase bg-[#f0b429]/10 px-2.5 py-1 rounded">
                DRAFT
              </span>
              <span className="text-slate-600 text-xs">
                Live HTML Document · 20 Sections · All Photos &amp; Charts
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setViewing(true)}
            className="flex-1 bg-[#f0b429] hover:bg-[#f5c842] text-[#040d1a] font-black py-3.5 rounded-xl transition-colors text-sm"
          >
            View Document
          </button>
          <a
            href="/_internal/budget-draft/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3.5 rounded-xl transition-colors text-sm text-center"
          >
            Open in New Tab
          </a>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#071428] border border-white/10 rounded-xl p-4 text-center">
          <p className="text-[#f0b429] text-2xl font-black">879</p>
          <p className="text-slate-500 text-xs mt-1">Calls (2025)</p>
        </div>
        <div className="bg-[#071428] border border-white/10 rounded-xl p-4 text-center">
          <p className="text-red-400 text-2xl font-black">-$157K</p>
          <p className="text-slate-500 text-xs mt-1">Projected Deficit</p>
        </div>
        <div className="bg-[#071428] border border-white/10 rounded-xl p-4 text-center">
          <p className="text-emerald-400 text-2xl font-black">35%</p>
          <p className="text-slate-500 text-xs mt-1">Levy Utilization</p>
        </div>
      </div>

      <p className="text-slate-700 text-xs text-center">
        This document is not linked from any public-facing page on millstadtems.org.
        To print, open in a new tab and use File → Print → Save as PDF.
      </p>
    </div>
  );
}
