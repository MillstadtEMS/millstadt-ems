import { parse } from "next/dist/compiled/node-html-parser";

export const canvassIndex = "https://www.co.st-clair.il.us/departments/county-clerk/elections/previous-election-results";
const electionDate = /\bNovember 0?3, 2026\b/i;
const voteCount = /^(?:\d+|\d{1,3}(?:,\d{3})+)$/;

export function findCanvass(html: string) {
  const links = new Set<string>();
  for (const link of parse(html).querySelectorAll("a.DocumentContainerLink")) {
    const title = link.querySelector(".DocumentItemTitle")?.text ?? "";
    if (!/\b2026\b/.test(title) || !/\bgeneral\b/i.test(title) || !/\bcanvass\b/i.test(title) ||
        /\b(primary|unofficial|draft|sample|partial|preliminary)\b/i.test(title)) continue;
    const href = link.getAttribute("href");
    if (!href) continue;
    const url = new URL(href, canvassIndex);
    if (url.origin !== new URL(canvassIndex).origin || !url.pathname.toLowerCase().endsWith(".pdf")) continue;
    url.search = ""; // The clerk appends the current time to document links.
    url.hash = "";
    links.add(url.href);
  }
  return links.size === 1 ? [...links][0] : null;
}

// Read only the clerk's official cover and the county-total row for this ballot
// question. A different contest can include "Millstadt" among its precincts.
export async function readCanvassTotals(data: Uint8Array) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // Load the worker explicitly so the deployed server also includes it.
  await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  const doc = await getDocument({ data, isEvalSupported: false, useSystemFonts: true }).promise;
  async function words(n: number) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    page.cleanup();
    return content.items.flatMap(item => "str" in item && item.str.trim() ? [item.str.trim()] : []);
  }
  try {
    if (doc.numPages > 1000) return null;
    const cover = (await words(1)).join(" ");
    if (!electionDate.test(cover) || !/\bGeneral Election\b/i.test(cover) ||
        !/\bOfficial Canvass\b/i.test(cover) || !/St\. Clair County, Illinois/i.test(cover) ||
        /\b(unofficial|draft|sample|preliminary)\b/i.test(cover)) return null;
    let result: { yes: number; no: number; page: number } | null = null;
    for (let n = 2; n <= doc.numPages; n++) {
      const cells = await words(n);
      const start = cells.indexOf("REGISTERED");
      if (start < 0) continue;
      const heading = cells.slice(0, start).join(" ");
      if (!electionDate.test(heading) || !/\bGeneral Election\b/i.test(heading)) continue;
      const isQuestion = /\borganized as Millstadt EMS ESD\b/i.test(heading) ||
        (/\bProposed Millstadt Fire\b/i.test(heading) && /territory described as currently comprising the Millstadt Fire Protection District/i.test(heading));
      if (!isQuestion) continue;
      const cols = cells.slice(start, start + 7).join(" ");
      if (cols !== "REGISTERED VOTERS BALLOTS CAST TURNOUT YES NO") return null;
      const total = cells.lastIndexOf("ST. CLAIR COUNTY,");
      if (total < 0) continue;
      const [state, registered, ballots, turnout, yes, no, ...extra] = cells.slice(total + 1);
      if (result || state !== "ILLINOIS" || ![registered, ballots, yes, no].every(x => voteCount.test(x)) ||
          !/^\d+(?:\.\d+)?%$/.test(turnout) || extra.length) return null;
      result = { yes: Number(yes.replaceAll(",", "")), no: Number(no.replaceAll(",", "")), page: n };
      if (!Number.isSafeInteger(result.yes + result.no)) return null;
    }
    return result;
  } finally {
    await doc.destroy();
  }
}

export async function readClerkCanvass() {
  const options = { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000) } as const;
  const index = await fetch(canvassIndex, options);
  if (!index.ok) throw new Error("County canvass index unavailable");
  const url = findCanvass(await index.text());
  if (!url) return null;
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("County canvass unavailable");
  const data = new Uint8Array(await response.arrayBuffer());
  // Keep the clerk’s direct link available for a scanned or unreadable document.
  const totals = data.byteLength <= 20_000_000 ? await readCanvassTotals(data).catch(() => null) : null;
  return { url, totals };
}
