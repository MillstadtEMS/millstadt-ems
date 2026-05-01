"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { buildApplicationFlags } from "@/lib/application-flags";
import ApplicantWorkflowPanel from "@/components/admin/ApplicantWorkflow";
import type { ApplicantWorkflow } from "@/lib/applicant-workflow";

interface Submission { id: string; formType: string; fields: Record<string, string | string[]>; submittedAt: string; readAt: string | null; }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" }) + " CT";
}

function formatKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function SubmissionDetail() {
  const { id } = useParams<{ id: string }>();
  const [sub, setSub] = useState<Submission | null>(null);
  const [workflow, setWorkflow] = useState<ApplicantWorkflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/submissions?id=${id}`)
      .then(r => r.json())
      .then(async (data) => {
        setSub(data);
        setLoading(false);
        // Mark as read
        if (data && !data.readAt) {
          await fetch("/api/admin/submissions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
        }
        // Load the applicant workflow if this is an Employment Application
        if (data?.formType === "Employment Application") {
          fetch(`/api/admin/applicants/${id}`)
            .then(r => r.json())
            .then(d => { if (d?.workflow) setWorkflow(d.workflow); })
            .catch(() => {});
        }
      })
      .catch(() => setLoading(false));
  }, [id]);

  async function del() {
    if (!confirm("Delete this submission permanently?")) return;
    setDeleting(true);
    await fetch("/api/admin/submissions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    window.location.href = `/admin/submissions?type=${encodeURIComponent(sub?.formType ?? "")}`;
  }

  // Open a clean printable window formatted like a proper paper employment
  // application — sections, labeled boxes, signature line, etc.
  function printPdf() {
    if (!sub) return;
    const f = sub.fields;
    const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>");
    const get = (k: string) => {
      const v = f[k];
      return Array.isArray(v) ? v.join(", ") : (v ? String(v) : "");
    };

    const fullName = [get("first_name"), get("middle_name"), get("last_name")].filter(Boolean).join(" ").trim();
    const isApp = sub.formType === "Employment Application";

    // Field renderer — looks like a fill-in box
    const fld = (label: string, value: string, opts: { wide?: boolean; tall?: boolean } = {}) => {
      const cls = ["field", opts.wide ? "wide" : "", opts.tall ? "tall" : ""].filter(Boolean).join(" ");
      return `<div class="${cls}"><div class="field-label">${esc(label)}</div><div class="field-value">${value ? esc(value) : "&nbsp;"}</div></div>`;
    };

    const sectionTitle = (n: string, name: string) => `<div class="section-title"><span class="section-num">${n}</span><span>${esc(name)}</span></div>`;

    let body = "";

    if (isApp) {
      // ── Application form layout ──
      const flagSection = flags.length > 0 ? `
        <div class="flag-banner">
          <div class="flag-header">⚠ FLAG FOR REVIEW &mdash; ${flags.length} item${flags.length === 1 ? "" : "s"} require attention</div>
          <ul>${flags.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
        </div>
      ` : "";

      body = `
        ${flagSection}

        ${sectionTitle("1", "Position Applied For")}
        <div class="row">
          ${fld("Position Applied For", get("position"), { wide: true })}
          ${fld("Employment Type", get("employment_type"), { wide: true })}
        </div>
        <div class="row">
          ${fld("Days Available", get("days_available"), { wide: true })}
          ${fld("Hours Available", get("hours_available"), { wide: true })}
        </div>
        ${get("preferred_shift") ? `<div class="row">${fld("Preferred Shift / Notes", get("preferred_shift"), { wide: true })}</div>` : ""}

        ${sectionTitle("2", "Personal Information")}
        <div class="row row-3">
          ${fld("First Name", get("first_name"))}
          ${fld("Middle Name", get("middle_name"))}
          ${fld("Last Name", get("last_name"))}
        </div>
        <div class="row">
          ${fld("Date of Birth", get("dob"))}
          ${fld("Social Security #", get("ssn_last4"))}
        </div>
        <div class="row">
          ${fld("Phone Number", get("phone"))}
          ${fld("Email Address", get("email"))}
        </div>
        <div class="row">
          ${fld("Street Address", get("address"))}
          ${fld("City, State, ZIP", get("city_state_zip"))}
        </div>
        <div class="row row-3">
          ${fld("DL State", get("dl_state"))}
          ${fld("DL Number", get("dl_number"))}
          ${fld("DL Expiration", get("dl_expiry"))}
        </div>

        ${sectionTitle("3", "Eligibility & Background")}
        <div class="row row-4">
          ${fld("Authorized to Work in U.S.", get("authorized_us"))}
          ${fld("Felony Conviction", get("felony"))}
          ${fld("Excluded from Medicare/Medicaid", get("excluded_medicare"))}
          ${fld("License Suspended/Revoked", get("license_suspended"))}
        </div>
        ${get("background_explain") ? `<div class="row">${fld("Background Explanation", get("background_explain"), { wide: true, tall: true })}</div>` : ""}
        <div class="row">${fld("Consents Given", get("consents"), { wide: true })}</div>

        ${sectionTitle("4", "Education")}
        <div class="row">
          ${fld("High School Name", get("hs_name"))}
          ${fld("Graduation Year", get("hs_grad"))}
        </div>
        ${get("college_education") ? `<div class="row">${fld("College / University", get("college_education"), { wide: true, tall: true })}</div>` : ""}

        ${sectionTitle("5", "Licensure")}
        <div class="row row-4">
          ${fld("Primary License Type", get("primary_license_type"))}
          ${fld("State", get("primary_license_state"))}
          ${fld("License #", get("primary_license_number"))}
          ${fld("Expiration", get("primary_license_expiry"))}
        </div>
        ${get("add_license_type") ? `<div class="row row-4">
          ${fld("Additional License Type", get("add_license_type"))}
          ${fld("State", get("add_license_state"))}
          ${fld("License #", get("add_license_number"))}
          ${fld("Expiration", get("add_license_expiry"))}
        </div>` : ""}
        <div class="row row-3">
          ${fld("NREMT Level", get("nremt_level"))}
          ${fld("NREMT Number", get("nremt_number"))}
          ${fld("Expiration", get("nremt_expiry"))}
        </div>
        ${get("dea_number") ? `<div class="row">
          ${fld("DEA Number", get("dea_number"))}
          ${fld("DEA Expiration", get("dea_expiry"))}
        </div>` : ""}

        ${sectionTitle("6", "Certifications")}
        <div class="row">${fld("Certifications", get("additional_certs"), { wide: true, tall: true })}</div>

        ${sectionTitle("7", "Work History")}
        <div class="row">${fld("Employment History", get("work_history"), { wide: true, tall: true })}</div>

        ${sectionTitle("8", "EMS Experience")}
        <div class="row row-3">
          ${fld("Years of EMS Experience", get("years_ems"))}
          ${fld("Years of ALS Experience", get("years_als"))}
          ${fld("Years of Critical Care", get("years_cc"))}
        </div>

        ${sectionTitle("9", "Driving History")}
        <div class="row row-5">
          ${fld("Valid Driver's License", get("valid_dl"))}
          ${fld("CDL", get("cdl"))}
          ${fld("Accidents (5 yrs)", get("accidents"))}
          ${fld("Violations (5 yrs)", get("violations"))}
          ${fld("Suspension (5 yrs)", get("dl_suspension"))}
        </div>
        ${get("driving_explain") ? `<div class="row">${fld("Driving Explanation", get("driving_explain"), { wide: true, tall: true })}</div>` : ""}

        ${get("availability") ? `${sectionTitle("10", "Willing to Work")}
        <div class="row">${fld("Availability", get("availability"), { wide: true })}</div>` : ""}

        ${sectionTitle("11", "Professional References")}
        <div class="row">${fld("References", get("references"), { wide: true, tall: true })}</div>

        ${sectionTitle("12", "Additional Information")}
        ${get("why_millstadt") ? `<div class="row">${fld("Why Millstadt EMS?", get("why_millstadt"), { wide: true, tall: true })}</div>` : ""}
        ${get("five_year_goals") ? `<div class="row">${fld("5-Year Goals", get("five_year_goals"), { wide: true, tall: true })}</div>` : ""}

        ${sectionTitle("13", "Applicant Certification")}
        <div class="cert-statement">
          I certify that all information provided in this application is true and complete to the best of my knowledge.
          I understand that falsification or omission of information may result in disqualification from consideration or termination of employment.
        </div>
        <div class="row">
          ${fld("Certified", get("certified") === "on" ? "✓ Acknowledged & Agreed" : "—", { wide: true })}
        </div>
        <div class="signature-row">
          <div class="signature-line">
            <div class="signature-label">Applicant Signature</div>
            <div class="signature-value">${esc(fullName)}</div>
          </div>
          <div class="signature-line short">
            <div class="signature-label">Date Submitted</div>
            <div class="signature-value">${esc(fmtDate(sub.submittedAt))}</div>
          </div>
        </div>
      `;
    } else {
      // ── Generic submission layout (other forms) ──
      const flagSection = flags.length > 0 ? `
        <div class="flag-banner">
          <div class="flag-header">⚠ FLAG FOR REVIEW &mdash; ${flags.length} item${flags.length === 1 ? "" : "s"} flagged</div>
          <ul>${flags.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
        </div>
      ` : "";

      const fieldsHtml = Object.entries(f)
        .filter(([k]) => k !== "formType" && k !== "review_flags")
        .map(([k, v]) => fld(formatKey(k), Array.isArray(v) ? v.join(", ") : String(v ?? ""), { wide: true }))
        .join("");
      body = `${flagSection}<div class="row">${fieldsHtml}</div>`;
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(fullName || "Submission")} — ${esc(sub.formType)}</title>
<style>
  @page { margin: 0.4in; size: letter; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, "Times New Roman", serif; color: #1a1a1a; margin: 0; padding: 0; background: #fff; line-height: 1.4; }

  /* Letterhead */
  .letterhead {
    border-bottom: 4px double #1e3a6e;
    padding-bottom: 14px;
    margin-bottom: 20px;
  }
  .lh-org { color: #c9a93a; font-size: 10px; font-weight: bold; letter-spacing: 0.3em; text-transform: uppercase; margin-bottom: 4px; font-family: Arial, sans-serif; }
  .lh-title { font-size: 26px; font-weight: bold; color: #0f1e3a; letter-spacing: 0.02em; margin: 0; }
  .lh-sub { font-size: 11px; color: #555; margin-top: 4px; font-family: Arial, sans-serif; }

  /* Submission top meta */
  .top-meta {
    display: flex;
    justify-content: space-between;
    margin-bottom: 18px;
    padding: 10px 14px;
    background: #f4f1e8;
    border-left: 4px solid #c9a93a;
    font-family: Arial, sans-serif;
  }
  .top-meta .label { font-size: 9px; font-weight: bold; color: #555; text-transform: uppercase; letter-spacing: 0.08em; display: block; }
  .top-meta .value { font-size: 13px; color: #111; font-weight: bold; }

  /* Flag banner */
  .flag-banner { border: 2px solid #dc2626; background: #fef2f2; padding: 14px 18px; margin-bottom: 20px; }
  .flag-header { color: #b91c1c; font-weight: bold; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; font-family: Arial, sans-serif; }
  .flag-banner ul { margin: 0; padding-left: 22px; }
  .flag-banner li { color: #7f1d1d; font-size: 11px; line-height: 1.5; margin-bottom: 3px; font-family: Arial, sans-serif; }

  /* Section title */
  .section-title {
    background: #0f1e3a;
    color: #fff;
    padding: 6px 12px;
    margin: 18px 0 8px;
    font-family: Arial, sans-serif;
    font-size: 11px;
    font-weight: bold;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 10px;
    page-break-after: avoid;
  }
  .section-num {
    display: inline-block;
    width: 22px; height: 22px;
    line-height: 22px;
    text-align: center;
    background: #c9a93a;
    color: #0f1e3a;
    border-radius: 50%;
    font-size: 12px;
    font-weight: bold;
  }

  /* Field rows */
  .row { display: grid; gap: 10px; margin-bottom: 10px; grid-template-columns: 1fr 1fr; }
  .row-3 { grid-template-columns: 1fr 1fr 1fr; }
  .row-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
  .row-5 { grid-template-columns: 1fr 1fr 1fr 1fr 1fr; }
  .row .field.wide { grid-column: 1 / -1; }

  /* Fill-in-the-blank fields */
  .field {
    display: flex;
    flex-direction: column;
    page-break-inside: avoid;
  }
  .field-label {
    font-family: Arial, sans-serif;
    font-size: 8.5px;
    font-weight: bold;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 2px;
  }
  .field-value {
    border: 1px solid #999;
    border-radius: 2px;
    padding: 6px 10px;
    min-height: 22px;
    background: #fff;
    font-size: 11.5px;
    color: #111;
    line-height: 1.4;
    word-wrap: break-word;
  }
  .field.tall .field-value {
    min-height: 64px;
    white-space: pre-wrap;
  }

  /* Cert statement */
  .cert-statement {
    border: 1px solid #999;
    background: #fafaf5;
    padding: 12px 14px;
    margin: 8px 0 12px;
    font-size: 11px;
    line-height: 1.5;
    font-style: italic;
    color: #333;
  }

  /* Signature row */
  .signature-row {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 16px;
    margin-top: 16px;
  }
  .signature-line {
    border-bottom: 2px solid #1a1a1a;
    padding: 16px 0 4px;
    position: relative;
  }
  .signature-label {
    font-family: Arial, sans-serif;
    font-size: 8.5px;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: bold;
    position: absolute;
    bottom: -16px;
    left: 0;
  }
  .signature-value {
    font-family: "Brush Script MT", "Lucida Handwriting", cursive;
    font-size: 18px;
    color: #1a3a6b;
    padding-bottom: 4px;
  }

  /* Footer */
  .doc-footer {
    margin-top: 36px;
    padding-top: 12px;
    border-top: 1px solid #ccc;
    color: #888;
    font-size: 9px;
    font-family: Arial, sans-serif;
    display: flex;
    justify-content: space-between;
  }

  @media print {
    body { padding: 0; }
    .section-title { page-break-after: avoid; }
    .field { page-break-inside: avoid; }
    .signature-row { page-break-inside: avoid; }
  }
</style></head><body>
  <div class="letterhead">
    <div class="lh-org">Millstadt Ambulance Service</div>
    <h1 class="lh-title">${esc(sub.formType)}</h1>
    <div class="lh-sub">Reviewed copy — auto-generated from website submission</div>
  </div>
  <div class="top-meta">
    <div>
      <span class="label">Applicant</span>
      <span class="value">${esc(fullName || "—")}</span>
    </div>
    <div>
      <span class="label">Submitted</span>
      <span class="value">${esc(fmtDate(sub.submittedAt))}</span>
    </div>
    <div>
      <span class="label">Submission ID</span>
      <span class="value" style="font-family:monospace;font-size:11px;">${esc(sub.id)}</span>
    </div>
  </div>
  ${body}
  <div class="doc-footer">
    <span>Millstadt Ambulance Service &mdash; millstadtems.org</span>
    <span>Printed ${esc(new Date().toLocaleString("en-US", { timeZone: "America/Chicago" }))} CT</span>
  </div>
  <script>window.onload = () => { setTimeout(() => window.print(), 250); };</script>
</body></html>`;

    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) {
      alert("Pop-up blocked. Please allow pop-ups for this site to print.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  if (loading) return <div className="text-slate-500 text-sm py-12">Loading…</div>;
  if (!sub) return <div className="text-slate-500 text-sm py-12">Submission not found.</div>;

  const fieldEntries = Object.entries(sub.fields).filter(([k]) => k !== "formType" && k !== "review_flags");
  // Only run flag detection on Employment Application submissions
  const flags = sub.formType === "Employment Application" ? buildApplicationFlags(sub.fields) : [];

  return (
    <>
      {/* Print styles — hide everything except the print-area card.
          Uses visibility (not display) so ancestors stay laid out, and
          repositions the print-area to fill the page. */}
      <style>{`
        @media print {
          @page { margin: 0.5in; }
          body { background: #ffffff !important; color: #000 !important; }
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #000 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .print-area * {
            background: transparent !important;
            color: #000 !important;
            border-color: #ccc !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="max-w-3xl">
        {/* Back nav */}
        <Link href={`/admin/submissions?type=${encodeURIComponent(sub.formType)}`} className="no-print inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mb-6 transition-colors">
          <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd"/></svg>
          Back to {sub.formType}
        </Link>

        {/* Header */}
        <div className="no-print mb-8">
          <div className="flex items-center gap-3 mb-2"><span className="h-px w-8 bg-[#f0b429]" /><span className="text-[#f0b429] text-xs font-black tracking-[0.25em] uppercase">{sub.formType}</span></div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-white">
                {String(sub.fields.first_name ?? sub.fields.name ?? "Submission")} {String(sub.fields.last_name ?? "")}
              </h1>
              <p className="text-slate-400 text-sm mt-1">{fmtDate(sub.submittedAt)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={printPdf} className="no-print flex items-center gap-2 bg-[#071428] border border-white/10 hover:border-white/20 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
                Print / PDF
              </button>
              <button onClick={del} disabled={deleting} className="no-print flex items-center gap-2 border border-red-500/20 hover:bg-red-500/10 text-red-400 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-40">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Hiring Workflow (Employment Applications only) ── */}
        {workflow && sub.formType === "Employment Application" && (
          <ApplicantWorkflowPanel initialWorkflow={workflow} submissionId={sub.id} />
        )}

        {/* ── Flag for review banner — prominent at the top ── */}
        {flags.length > 0 && (
          <div className="mb-6 overflow-hidden rounded-2xl border-2 border-red-500/60 bg-red-950/30">
            <div className="flex items-center gap-3 px-6 py-4 bg-red-600 text-white">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current shrink-0"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
              <div className="flex-1">
                <div className="font-black text-base uppercase tracking-wider">Flag for Review</div>
                <div className="text-sm opacity-90">{flags.length} item{flags.length === 1 ? "" : "s"} flagged on this application</div>
              </div>
            </div>
            <ul className="divide-y divide-red-500/20">
              {flags.map((flag, i) => (
                <li key={i} className="flex items-start gap-3 px-6 py-3">
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  <span className="text-red-100 text-sm leading-relaxed">{flag}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-red-500/20 bg-red-950/40 px-6 py-3 text-xs text-red-300/80">
              Auto-generated based on the applicant&apos;s answers. Review before scheduling an interview or extending an offer.
            </div>
          </div>
        )}

        {/* Printable card */}
        <div className="print-area bg-[#071428] border border-white/10 rounded-2xl overflow-hidden">
          {/* Print-only header */}
          <div className="hidden print:block p-8 border-b border-white/10">
            <div className="text-2xl font-black text-white">Millstadt Ambulance Service</div>
            <div className="text-slate-400 text-sm mt-1">{sub.formType} — {fmtDate(sub.submittedAt)}</div>
          </div>

          <div className="p-8 space-y-6">
            {fieldEntries.map(([key, val]) => {
              const value = Array.isArray(val) ? val.join(", ") : (val || "—");
              const isLong = value.length > 80;
              return (
                <div key={key} className={isLong ? "" : "grid grid-cols-[1fr_2fr] gap-4 items-start"}>
                  <div className="text-slate-400 text-sm font-semibold">{formatKey(key)}</div>
                  <div className={`text-white text-sm leading-relaxed ${isLong ? "mt-2 pl-0" : ""}`}>
                    {value === "—" ? <span className="text-slate-600">—</span> : value}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-8 py-4 border-t border-white/8 flex items-center justify-between">
            <span className="text-slate-600 text-xs">Submission ID: {sub.id}</span>
            <span className="text-slate-600 text-xs">{sub.readAt ? `Read ${new Date(sub.readAt).toLocaleDateString()}` : "Unread"}</span>
          </div>
        </div>
      </div>
    </>
  );
}
