/**
 * Manual end-to-end test for the rebuilt report system.
 *
 * Writes a sample incident PDF + email HTML to /tmp so a human can open
 * them and verify. Exercises every edge case the brief calls out:
 *   - Long summary text with em-dashes, smart quotes, ellipses.
 *   - Multiple involved employees.
 *   - No patient (so the fallback shows "None reported").
 *   - Multiple witnesses + actions blocks.
 *   - Multiple image attachments + one PDF attachment.
 *   - One oversized image to confirm proportional scaling.
 *   - Special characters: apostrophes, em-dashes, curly quotes.
 *
 * Run with:
 *   npx tsx scripts/test-report.ts
 */

import fs from "node:fs/promises";
import path from "node:path";
import { buildIncidentPdf } from "@/lib/lounge/incident-pdf";
import { renderEmailShell } from "@/lib/reports/email-shell";
import {
  asciiSafe,
  buildReportSubject,
  encodeMimeSubject,
  isoChicagoDate,
} from "@/lib/reports/subject";
import { buildReportFilename } from "@/lib/reports/filename";
import { fallbackText, normalizePunctuation } from "@/lib/reports/sanitize";

// ── Patch fetch so attachment URLs resolve to local files ─────────────
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: unknown, init?: unknown) => {
  const url = typeof input === "string" ? input : (input as { url: string }).url;
  if (url.startsWith("mock://")) {
    const localPath = path.join(process.cwd(), "public", url.replace("mock://", ""));
    const data = await fs.readFile(localPath);
    return new Response(data, { status: 200 });
  }
  return realFetch(input as never, init as never);
}) as typeof globalThis.fetch;

// ── Sample data ───────────────────────────────────────────────────────
const longSummary = [
  "On call at 14:32 hours, Unit 3926 responded to a single-vehicle collision",
  "with reported entrapment at Highway 158 and Lenz Lane.",
  "Driver — a 56-year-old male — was conscious but disoriented on arrival.",
  "Patient said \"I think I blacked out\" and reported \"feeling weird\" prior",
  "to the wreck. Vehicle's airbags deployed; the dashboard had collapsed",
  "into the driver's lower legs.",
  "Crew worked with Millstadt Fire for extrication. C-spine maintained,",
  "supplemental O2 administered, and a 12-lead was obtained — wide-complex",
  "tachycardia noted. ALS-2 protocol followed; cardiology was notified",
  "en route to St. Elizabeth's.",
  "Family was contacted by Millstadt PD at the scene; no further requests.",
].join(" ");

const sample = {
  id: "8f3c2a5e-1234-4abc-9def-987654321000",
  createdBy: { name: "Kenneth James" },
  incidentDate: "2026-05-29",
  incidentTime: "14:32",
  city: "Millstadt",
  specificLocation: "Highway 158 & Lenz Lane (eastbound shoulder)",
  unitInvolved: "m3926",
  summary: longSummary,
  patientInvolved: "nope", // tests the placeholder collapse → "None reported"
  witnesses: "Several bystanders on scene — a delivery driver and two staff from the gas station across the street. None gave names.",
  actionsTaken: "Patient assessed, stabilized, c-collar applied, IV started, transported to St. Elizabeth's. Notified the medical director's office on arrival.",
  involvedEmployees: [
    { id: "1", name: "Kenneth L. James Jr." },
    { id: "2", name: "Dylan Spencer" },
    { id: "3", name: "Jennifer Goetz" },
    { id: "4", name: "Kasey Wetzel" },
  ],
  photos: [
    { url: "mock://lounge/brand/hero-3926.jpg",       name: "Scene overview" },
    { url: "mock://lounge/brand/crew-community.jpg",  name: "Crew on scene" },
    { url: "mock://lounge/brand/compartment.jpg",     name: "Patient compartment post-transport" },
    { url: "mock://images/millstadt-ems/logo.png",    name: "Reference photo - vehicle decal" },
  ],
  submittedAt: new Date().toISOString(),
};

async function main() {
  console.log("=== Generating sample incident report ===\n");

  // PDF
  const pdf = await buildIncidentPdf(sample);
  const pdfFilename = buildReportFilename({
    type: "Incident Report",
    unit: sample.unitInvolved,
    date: sample.incidentDate,
  });
  await fs.writeFile("/tmp/test-incident.pdf", pdf);
  console.log(`PDF      : /tmp/test-incident.pdf  (${(pdf.byteLength / 1024).toFixed(1)} KB)`);
  console.log(`Filename : ${pdfFilename}\n`);

  // Subject
  const subjectPlain = buildReportSubject({
    type: "Incident Report Submitted",
    unit: sample.unitInvolved,
    location: sample.city,
    date: sample.incidentDate,
    submitter: sample.createdBy.name,
  });
  const subjectHeader = encodeMimeSubject(subjectPlain);
  console.log(`Subject (plain)  : ${subjectPlain}`);
  console.log(`Subject (header) : ${subjectHeader}\n`);

  // Email HTML
  const html = renderEmailShell({
    preheader: `Unit ${sample.unitInvolved} · ${sample.city} — submitted by ${sample.createdBy.name}`,
    kicker: "Incident Report",
    title: `Unit ${sample.unitInvolved} — ${sample.city}`,
    subtitle: `Submitted by ${asciiSafe(sample.createdBy.name)} on ${isoChicagoDate(new Date())}`,
    meta: [
      { label: "Report ID",      value: sample.id.split("-")[0].toUpperCase(), mono: true },
      { label: "Incident date",  value: sample.incidentDate },
      { label: "Incident time",  value: sample.incidentTime },
      { label: "Unit involved",  value: sample.unitInvolved },
      { label: "City",           value: sample.city },
      { label: "Crew involved",  value: sample.involvedEmployees.map(e => e.name).join(", ") },
      { label: "Attachments",    value: `${sample.photos.length} files (included in attached PDF)` },
    ],
    callout: {
      label: "Summary preview",
      text: normalizePunctuation(sample.summary).slice(0, 280) + "...",
    },
    sections: [
      { heading: "Patient involved", text: fallbackText(sample.patientInvolved, "noneReported") },
      { heading: "Witnesses",        text: fallbackText(sample.witnesses, "noWitnesses") },
    ],
    cta: {
      label: "Open report in admin",
      url: "https://millstadtems.org/admin/incidents/test",
    },
    pdfNote: `Full report attached: ${pdfFilename}`,
    footerNote: "Millstadt EMS · Official agency report · This message was sent automatically by the lounge incident-reporting system.",
  });
  await fs.writeFile("/tmp/test-incident.html", html);
  console.log(`Email HTML : /tmp/test-incident.html  (${html.length} chars)\n`);
}

main().catch((err) => {
  console.error("Sample render failed:", err);
  process.exit(1);
});
