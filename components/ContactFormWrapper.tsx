"use client";

import { useState } from "react";
import Link from "next/link";
/* Link is used in the success state below */

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
      <div
        className="p-8 sm:p-12 text-center rounded-[1.35rem]"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(52,211,153,0.14), transparent 18rem), linear-gradient(145deg, rgba(14,31,59,0.96), rgba(3,9,20,0.98))",
          border: "1px solid rgba(52,211,153,0.24)",
          boxShadow: "0 28px 84px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        <div
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-[#052e1a] text-4xl font-black"
          style={{ background: "linear-gradient(135deg, #a7f3d0, #34d399)", boxShadow: "0 18px 42px rgba(52,211,153,0.20)" }}
        >
          ✓
        </div>
        <h3 className="text-white font-black text-2xl uppercase tracking-wide mb-3">Submitted Successfully</h3>
        <p className="text-slate-400 text-base leading-relaxed mb-8">
          We received your request and will reach out soon.
        </p>
        <Link
          href={backHref}
          className="inline-flex items-center justify-center rounded-xl px-8 py-3 bg-[#f0b429] hover:bg-[#d9a320] text-[#040d1a] font-black text-sm uppercase tracking-widest transition-colors"
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
          className="mt-8 rounded-2xl px-4 py-3 text-sm leading-relaxed text-slate-300"
          style={{
            background: "linear-gradient(145deg, rgba(240,180,41,0.10), rgba(2,9,18,0.70))",
            border: "1px solid rgba(240,180,41,0.24)",
          }}
        >
          {disclaimer}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="block w-full rounded-2xl py-5 mt-10 bg-[#f0b429] hover:bg-[#d9a320] disabled:opacity-60 text-[#040d1a] font-black text-base uppercase tracking-widest transition-all"
        style={{
          boxShadow: "0 22px 54px rgba(240,180,41,0.22), inset 0 1px 0 rgba(255,255,255,0.36)",
        }}
      >
        {status === "sending" ? "Submitting…" : "Submit Request"}
      </button>

      {status === "error" && (
        <p className="text-red-300 text-sm pt-4 leading-relaxed">
          Something went wrong. Please try again or email us directly at millstadtems@gmail.com.
        </p>
      )}
    </form>
  );
}
