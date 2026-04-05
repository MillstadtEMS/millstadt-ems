"use client";

import { useState } from "react";
import Link from "next/link";

interface Props {
  formType: string;
  disclaimer?: string;
  backHref?: string;
  children: React.ReactNode;
}

const btnClass =
  "flex items-center justify-center w-full py-6 font-black text-lg rounded-2xl transition-colors";

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

    // Collect all form data — getAll handles multi-value fields (checkboxes)
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
      <div className="p-16 rounded-2xl bg-[#071428] border border-white/8 text-center space-y-6">
        <div className="text-[#34d399] text-6xl font-black">✓</div>
        <h3 className="text-white font-black text-2xl">Submitted Successfully</h3>
        <p className="text-slate-400 text-lg leading-relaxed">
          We received your request and will reach out soon.
        </p>
        <Link
          href={backHref}
          className={`${btnClass} bg-[#f0b429] hover:bg-[#d9a320] text-[#040d1a] mt-6 w-full`}
        >
          Back to Forms
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {children}

      <div className="h-16" />

      <div className="flex flex-col gap-4 max-w-sm">
        <button
          type="submit"
          disabled={status === "sending"}
          className={`${btnClass} bg-[#f0b429] hover:bg-[#d9a320] disabled:opacity-60 text-[#040d1a]`}
        >
          {status === "sending" ? "Sending…" : "Submit Request"}
        </button>
        <Link
          href={backHref}
          className={`${btnClass} border-2 border-white/20 hover:border-[#f0b429]/50 hover:text-[#f0b429] text-white`}
        >
          Back to Forms
        </Link>
      </div>

      {status === "error" && (
        <p className="text-red-400 text-sm pt-4">
          Something went wrong. Please try again or email us directly at millstadtems@gmail.com.
        </p>
      )}

      {disclaimer && (
        <p className="text-slate-600 text-sm pt-6">{disclaimer}</p>
      )}
    </form>
  );
}
