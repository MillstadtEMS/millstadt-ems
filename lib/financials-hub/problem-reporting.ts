import { publicFinancialDocumentLibrary } from "./public-library";
import { PUBLIC_PAGE_URL, REPORT_EMAIL } from "./transparency-content";
import { escapeHtml } from "../security/http";
import type { GmailMessageInput, GmailSendResult } from "../reports/gmail-message";

export type ProblemReport = { description: string; documentId?: string };
const documents = new Map(publicFinancialDocumentLibrary().map(document => [document.id, document]));

export function parseProblemReport(value: unknown): ProblemReport | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !["description", "documentId", "website"].includes(key))) return null;
  if (input.website !== undefined && input.website !== "") return null;
  if (typeof input.description !== "string" || !input.description.trim() || input.description.length > 2000 || /\u0000/.test(input.description)) return null;
  if (input.documentId !== undefined && (typeof input.documentId !== "string" || !documents.has(input.documentId))) return null;
  return { description: input.description.trim(), ...(typeof input.documentId === "string" ? { documentId: input.documentId } : {}) };
}

export async function deliverProblemReport(input: ProblemReport, send: (message: GmailMessageInput) => Promise<GmailSendResult>) {
  const document = input.documentId ? documents.get(input.documentId) : undefined;
  const text = [
    "Website technical problem / bug report",
    "This channel is for technical problems only. Requests are not accepted.",
    `Page: ${PUBLIC_PAGE_URL}`,
    ...(document ? [`Document: ${document.title}`, `Link: ${document.viewUrl.startsWith("https://") ? document.viewUrl : `https://www.millstadtems.org${document.viewUrl}`}`] : []),
    "", "Problem description:", input.description,
  ].join("\n");
  try {
    const result = await send({
      fromName: "Millstadt EMS Website",
      to: [REPORT_EMAIL],
      subject: document ? `Website bug: ${document.title}` : "Millstadt EMS website technical problem",
      text,
      html: `<div style="white-space:pre-wrap;font-family:system-ui,sans-serif">${escapeHtml(text)}</div>`,
    });
    return { status: result.sent ? "sent" as const : "unavailable" as const };
  } catch {
    return { status: "unavailable" as const };
  }
}
