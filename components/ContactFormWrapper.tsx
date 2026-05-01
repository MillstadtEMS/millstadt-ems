"use client";

import { useState } from "react";
import Link from "next/link";

interface Props {
  formType: string;
  disclaimer?: string;
  backHref?: string;
  children: React.ReactNode;
}

export default function ContactFormWrapper({
  formType,
  disclaimer,
  backHref = "/forms",
  children,
}: Props) {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    const fd = new FormData(e.currentTarget);
    const fields: Record<string, string | string[]> = {};
    for (const key of new Set(fd.keys())) {
      const vals = fd.getAll(key);
      fields[key] = vals.length === 1 ? String(vals[0]) : vals.map(String);
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formType, ...fields }),
      });
      if (!res.ok) throw new Error("Server error");
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="p-12 text-center" style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="text-[#34d399] text-5xl font-black mb-4">✓</div>
        <h3 className="text-white font-black text-2xl uppercase tracking-wide mb-3">Submitted Successfully</h3>
        <p className="text-slate-400 text-base leading-relaxed mb-8">
          We received your request and will reach out soon.
        </p>
        <Link
          href={backHref}
          className="inline-block px-10 py-3 bg-[#f0b429] hover:bg-[#d9a320] text-[#040d1a] font-black text-sm uppercase tracking-widest transition-colors"
        >
          Back to Forms
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {children}

      {disclaimer && (
        <div
          className="p-4 mt-8 mb-10"
          style={{ background: "#0d0d0d", border: "1px solid rgba(240,180,41,0.4)", borderLeft: "4px solid #f0b429" }}
        >
          <p className="text-xs leading-relaxed text-slate-400">{disclaimer}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="block w-full py-5 bg-[#f0b429] hover:bg-[#d9a320] disabled:opacity-60 text-[#040d1a] font-black text-base uppercase tracking-widest transition-colors"
      >
        {status === "sending" ? "Submitting…" : "Submit Request"}
      </button>

      <Link
        href={backHref}
        className="block text-center text-slate-500 hover:text-slate-300 text-xs uppercase tracking-widest font-bold mt-6 transition-colors"
      >
        ← Cancel and return to forms
      </Link>

      {status === "error" && (
        <p className="text-red-400 text-sm pt-4">
          Something went wrong. Please try again or email us directly at millstadtems@gmail.com.
        </p>
      )}
    </form>
  );
}
