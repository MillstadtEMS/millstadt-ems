"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TurnstileWidget from "@/components/TurnstileWidget";
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
  const [csrfToken, setCsrfToken] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/contact", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || typeof data.csrfToken !== "string") throw new Error("CSRF token unavailable");
        if (!cancelled) setCsrfToken(data.csrfToken);
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!turnstileToken) {
      setErrorMessage("Please complete the security check before submitting.");
      setStatus("error");
      return;
    }
    setErrorMessage("");
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
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ formType, ...fields }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "The form could not be submitted.");
      setStatus("done");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The form could not be submitted.");
      setTurnstileResetKey((value) => value + 1);
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
      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor={`website-${formType.replace(/\s+/g, "-").toLowerCase()}`}>Website</label>
        <input
          id={`website-${formType.replace(/\s+/g, "-").toLowerCase()}`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
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

      <TurnstileWidget
        action="contact_form"
        onTokenChange={setTurnstileToken}
        resetKey={turnstileResetKey}
      />

      <button
        type="submit"
        disabled={status === "sending" || !csrfToken || !turnstileToken}
        className="block w-full rounded-2xl py-5 mt-10 bg-[#f0b429] hover:bg-[#d9a320] disabled:opacity-60 text-[#040d1a] font-black text-base uppercase tracking-widest transition-all"
        style={{
          boxShadow: "0 22px 54px rgba(240,180,41,0.22), inset 0 1px 0 rgba(255,255,255,0.36)",
        }}
      >
        {status === "sending" ? "Submitting…" : "Submit Request"}
      </button>

      {status === "error" && (
        <p className="text-red-300 text-sm pt-4 leading-relaxed">
          {errorMessage || "Something went wrong. Please try again or email us directly at millstadtems@gmail.com."}
        </p>
      )}
    </form>
  );
}
