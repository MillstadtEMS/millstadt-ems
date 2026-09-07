"use client";

import { useEffect, useMemo, useState } from "react";
import { formFieldLabel } from "@/lib/security/form-validation-messages";

export type PrintableSubmissionFields = Record<string, string | string[]>;

const OMITTED_FIELDS = new Set(["website", "securityCheckToken", "turnstileToken", "signature_data_url"]);

function escapeMarkup(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function displayValue(name: string, value: string | string[]) {
  const joined = Array.isArray(value) ? value.join(", ") : value;
  if (name === "acknowledgment" || name === "certified") return joined ? "Confirmed" : "Not confirmed";
  return joined.trim() || "Not provided";
}

export function printableFieldsFromFormData(formData: FormData): PrintableSubmissionFields {
  const fields: PrintableSubmissionFields = {};
  for (const name of new Set(formData.keys())) {
    if (OMITTED_FIELDS.has(name)) continue;
    const values = formData.getAll(name).flatMap((value) => {
      if (value instanceof File) return value.size > 0 ? [`Attached file: ${value.name}`] : [];
      return [String(value)];
    });
    fields[name] = values.length <= 1 ? (values[0] ?? "") : values;
  }
  return fields;
}

function printableHtml(formType: string, fields: PrintableSubmissionFields) {
  const rows = Object.entries(fields)
    .map(([name, value]) => `
      <tr>
        <th>${escapeMarkup(formFieldLabel(name))}</th>
        <td>${escapeMarkup(displayValue(name, value)).replaceAll("\n", "<br>")}</td>
      </tr>`)
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeMarkup(formType)} — Millstadt Ambulance Service</title>
  <style>
    body{font-family:Arial,sans-serif;color:#111827;max-width:850px;margin:0 auto;padding:32px;line-height:1.45}
    h1{font-size:24px;margin:0 0 4px} h2{font-size:16px;margin:28px 0 10px}
    .agency{font-weight:700;color:#374151}.notice{background:#fff7d6;border:1px solid #d4a72c;padding:14px;margin:24px 0}
    table{border-collapse:collapse;width:100%;font-size:13px}th,td{border:1px solid #d1d5db;padding:9px;text-align:left;vertical-align:top}
    th{width:34%;background:#f3f4f6}.actions{margin:0 0 24px}.actions button{padding:10px 16px;font-weight:700}
    .footer{margin-top:28px;font-size:12px;color:#4b5563}@media print{body{padding:0}.actions{display:none}}
  </style>
</head>
<body>
  <div class="actions"><button onclick="window.print()">Print this form</button></div>
  <div class="agency">Millstadt Ambulance Service</div>
  <h1>${escapeMarkup(formType)}</h1>
  <div>Backup copy created ${escapeMarkup(new Date().toLocaleString("en-US"))}</div>
  <div class="notice"><strong>Online delivery was not completed.</strong> Email this saved copy to <strong>millstadtems@gmail.com</strong> with the subject “Online form submission failed — ${escapeMarkup(formType)},” or print and mail/deliver it to 100 E Laurel St, Millstadt, IL 62260.</div>
  <h2>Submitted information</h2>
  <table><tbody>${rows}</tbody></table>
  <div class="footer">This copy was created locally in your browser. For emergencies, call 9-1-1. Do not use this form to send patient information or urgent medical details.</div>
</body>
</html>`;
}

export default function SubmissionFailureFallback({
  formType,
  fields,
}: {
  formType: string;
  fields: PrintableSubmissionFields;
}) {
  const [documentUrl, setDocumentUrl] = useState("");
  const html = useMemo(() => printableHtml(formType, fields), [fields, formType]);
  const fileName = `${formType.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "millstadt-ems-form"}-backup.html`;
  const emailHref = `mailto:millstadtems@gmail.com?subject=${encodeURIComponent(`Online form submission failed — ${formType}`)}&body=${encodeURIComponent("My online submission could not be delivered, so I am emailing the completed backup copy. It is attached to this message.")}`;

  useEffect(() => {
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    setDocumentUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [html]);

  return (
    <div className="mt-5 rounded-2xl border border-amber-400/35 bg-amber-950/20 p-5">
      <h3 className="text-base font-black uppercase tracking-wide text-amber-200">Backup delivery options</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">
        Your answers are still on this device. Download the completed form and attach it to an email to{" "}
        <a className="font-bold text-[#f0b429] underline" href={emailHref}>millstadtems@gmail.com</a>
        {" "}with the subject “Online form submission failed — {formType}.” You may also print it and mail or deliver it to
        100 E Laurel St, Millstadt, IL 62260.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <a
          href={documentUrl || undefined}
          download={fileName}
          aria-disabled={!documentUrl}
          className="inline-flex items-center justify-center rounded-xl bg-[#f0b429] px-5 py-3 text-center text-sm font-black uppercase tracking-wide text-[#040d1a]"
        >
          Download completed form
        </a>
        <a
          href={documentUrl || undefined}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!documentUrl}
          className="inline-flex items-center justify-center rounded-xl border border-white/20 px-5 py-3 text-center text-sm font-black uppercase tracking-wide text-white"
        >
          Open / print form
        </a>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-slate-400">
        For emergencies, call 9-1-1. Do not include patient information or urgent medical details in email.
      </p>
    </div>
  );
}
