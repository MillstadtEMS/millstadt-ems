/**
 * Branded HTML email shell for every Millstadt EMS report.
 *
 * Design rules (per the redesign brief):
 *   - Light card on an off-white outer background.
 *   - Navy header band with the agency wordmark + EMS crest.
 *   - Gold + red accents matching the livery; no emoji.
 *   - System sans-serif for body, serif for the headline, mono for ids.
 *   - Renders cleanly in Gmail mobile + desktop and in Apple Mail.
 *
 * All caller-supplied strings should be pre-sanitized with `escapeHtml`.
 * The shell never inserts user content unescaped.
 */

import { escapeHtml } from "./sanitize";

export interface MetaRow {
  label: string;
  /** Plain-text value. Will be escaped. */
  value: string;
  /** If true, render in mono for tabular numerals. */
  mono?: boolean;
}

export interface SectionBlock {
  heading: string;
  /** Plain-text body. Will be escaped + line-broken. */
  text: string;
}

export interface AttachmentItem {
  /** Filename / display label. */
  name: string;
  /** Optional file-size summary. */
  meta?: string;
}

export interface EmailShellOpts {
  /** Hidden preview line shown in Gmail's row preview. */
  preheader?: string;
  /** Top kicker in gold caps. e.g. "INCIDENT REPORT". */
  kicker: string;
  /** Big serif headline. */
  title: string;
  /** Optional subtitle directly below the title. */
  subtitle?: string;
  /** Key-value table directly under the title. */
  meta?: MetaRow[];
  /** The "callout" card — usually the report summary. */
  callout?: { label: string; text: string };
  /** Additional plain-text sections, rendered in order. */
  sections?: SectionBlock[];
  /** Optional attachment list. */
  attachments?: AttachmentItem[];
  /** Primary action button (e.g. "Open in admin"). */
  cta?: { label: string; url: string };
  /** Note shown below the CTA — typically the PDF attachment name. */
  pdfNote?: string;
  /** Small caption under everything. Defaults to the agency tagline. */
  footerNote?: string;
}

const COLORS = {
  navy:        "#0c2340",
  navyDeep:    "#091a30",
  gold:        "#f0b429",
  red:         "#c4202a",
  ink:         "#1a2330",
  inkMuted:    "#5b6675",
  inkSoft:     "#7e8794",
  border:      "#dde2e9",
  borderSoft:  "#ebeef3",
  cardBg:      "#ffffff",
  pageBg:      "#f3f5f8",
  calloutBg:   "#f5f8fb",
} as const;

const LOGO_URL = "https://millstadtems.org/images/millstadt-ems/logo.png";

const FONT_BODY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const FONT_DISPLAY = "Georgia, 'Times New Roman', Times, serif";
const FONT_MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace";

export function renderEmailShell(opts: EmailShellOpts): string {
  const preheader = opts.preheader ? escapeHtml(opts.preheader) : "";
  const kicker = escapeHtml(opts.kicker);
  const title = escapeHtml(opts.title);
  const subtitle = opts.subtitle ? escapeHtml(opts.subtitle) : "";

  const metaHtml = (opts.meta?.length ?? 0) > 0
    ? renderMeta(opts.meta!)
    : "";

  const calloutHtml = opts.callout
    ? renderCallout(opts.callout.label, opts.callout.text)
    : "";

  const sectionsHtml = (opts.sections?.length ?? 0) > 0
    ? opts.sections!.map((s) => renderSection(s)).join("")
    : "";

  const attachmentsHtml = (opts.attachments?.length ?? 0) > 0
    ? renderAttachments(opts.attachments!)
    : "";

  const ctaHtml = opts.cta ? renderCta(opts.cta) : "";
  const pdfNoteHtml = opts.pdfNote
    ? `<p style="margin:14px 0 0;color:${COLORS.inkSoft};font-size:13px;line-height:1.5;">${escapeHtml(opts.pdfNote)}</p>`
    : "";

  const footerNote = opts.footerNote ?? "Millstadt EMS · millstadtems.org · Official agency report";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.pageBg};font-family:${FONT_BODY};color:${COLORS.ink};">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;visibility:hidden;mso-hide:all;">${preheader}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.pageBg};padding:24px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${COLORS.cardBg};border:1px solid ${COLORS.border};border-radius:14px;overflow:hidden;">
        ${renderHeaderBand()}
        <tr>
          <td style="padding:28px 32px 8px;">
            <div style="font-family:${FONT_MONO};font-size:11px;letter-spacing:0.20em;text-transform:uppercase;color:${COLORS.gold};font-weight:600;">${kicker}</div>
            <h1 style="font-family:${FONT_DISPLAY};font-size:24px;line-height:1.2;letter-spacing:-0.01em;color:${COLORS.navy};font-weight:700;margin:6px 0 ${subtitle ? "4" : "12"}px;">${title}</h1>
            ${subtitle ? `<p style="margin:0 0 8px;color:${COLORS.inkMuted};font-size:14px;line-height:1.5;">${subtitle}</p>` : ""}
          </td>
        </tr>
        ${metaHtml ? `<tr><td style="padding:8px 32px 0;">${metaHtml}</td></tr>` : ""}
        ${calloutHtml ? `<tr><td style="padding:20px 32px 0;">${calloutHtml}</td></tr>` : ""}
        ${sectionsHtml ? `<tr><td style="padding:4px 32px 0;">${sectionsHtml}</td></tr>` : ""}
        ${attachmentsHtml ? `<tr><td style="padding:18px 32px 0;">${attachmentsHtml}</td></tr>` : ""}
        ${ctaHtml || pdfNoteHtml ? `<tr><td style="padding:24px 32px 8px;">${ctaHtml}${pdfNoteHtml}</td></tr>` : ""}
        <tr>
          <td style="padding:22px 32px 28px;border-top:1px solid ${COLORS.borderSoft};margin-top:18px;">
            <p style="margin:18px 0 0;color:${COLORS.inkSoft};font-size:11px;line-height:1.5;letter-spacing:0.02em;">${escapeHtml(footerNote)}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function renderHeaderBand(): string {
  return `<tr>
    <td style="background:${COLORS.navy};padding:18px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align:middle;width:54px;">
            <img src="${LOGO_URL}" alt="Millstadt EMS" width="44" height="44" style="display:block;border:0;width:44px;height:44px;" />
          </td>
          <td style="vertical-align:middle;padding-left:14px;">
            <div style="font-family:${FONT_DISPLAY};font-size:14px;letter-spacing:0.18em;text-transform:uppercase;color:#ffffff;font-weight:700;line-height:1.1;">Millstadt EMS</div>
            <div style="font-family:${FONT_BODY};font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${COLORS.gold};font-weight:600;margin-top:3px;">Official agency report</div>
          </td>
          <td align="right" style="vertical-align:middle;">
            <div style="display:inline-block;height:3px;width:42px;background:${COLORS.gold};border-radius:2px;"></div>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function renderMeta(rows: MetaRow[]): string {
  const cells = rows.map((r) => {
    const valueFont = r.mono ? FONT_MONO : FONT_BODY;
    return `<tr>
      <td style="padding:9px 0;border-top:1px solid ${COLORS.borderSoft};font-family:${FONT_BODY};font-size:12px;color:${COLORS.inkSoft};text-transform:uppercase;letter-spacing:0.10em;font-weight:600;width:40%;">${escapeHtml(r.label)}</td>
      <td style="padding:9px 0;border-top:1px solid ${COLORS.borderSoft};font-family:${valueFont};font-size:13.5px;color:${COLORS.ink};font-weight:500;line-height:1.45;">${escapeHtml(r.value)}</td>
    </tr>`;
  }).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;">${cells}</table>`;
}

function renderCallout(label: string, text: string): string {
  const safeLabel = escapeHtml(label);
  const safeText = escapeHtml(text).replace(/\n/g, "<br>");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.calloutBg};border:1px solid ${COLORS.borderSoft};border-left:3px solid ${COLORS.gold};border-radius:10px;">
    <tr>
      <td style="padding:16px 18px;">
        <div style="font-family:${FONT_MONO};font-size:10.5px;letter-spacing:0.18em;text-transform:uppercase;color:${COLORS.inkSoft};font-weight:600;">${safeLabel}</div>
        <p style="margin:8px 0 0;font-family:${FONT_BODY};font-size:14.5px;line-height:1.6;color:${COLORS.ink};">${safeText}</p>
      </td>
    </tr>
  </table>`;
}

function renderSection(s: SectionBlock): string {
  const safeHeading = escapeHtml(s.heading);
  const safeText = escapeHtml(s.text).replace(/\n/g, "<br>");
  return `<div style="margin-top:18px;">
    <div style="font-family:${FONT_MONO};font-size:10.5px;letter-spacing:0.18em;text-transform:uppercase;color:${COLORS.navy};font-weight:600;">${safeHeading}</div>
    <p style="margin:6px 0 0;font-family:${FONT_BODY};font-size:14px;line-height:1.6;color:${COLORS.ink};">${safeText}</p>
  </div>`;
}

function renderAttachments(items: AttachmentItem[]): string {
  const rows = items.map((it, i) => {
    const meta = it.meta ? escapeHtml(it.meta) : "";
    return `<tr>
      <td style="padding:10px 0;border-top:${i === 0 ? "0" : `1px solid ${COLORS.borderSoft}`};">
        <div style="font-family:${FONT_BODY};font-size:13.5px;color:${COLORS.ink};font-weight:600;line-height:1.4;">${escapeHtml(it.name)}</div>
        ${meta ? `<div style="font-family:${FONT_MONO};font-size:11.5px;color:${COLORS.inkSoft};line-height:1.4;margin-top:2px;">${meta}</div>` : ""}
      </td>
    </tr>`;
  }).join("");
  return `<div style="font-family:${FONT_MONO};font-size:10.5px;letter-spacing:0.18em;text-transform:uppercase;color:${COLORS.navy};font-weight:600;margin-bottom:4px;">Attachments</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.cardBg};border:1px solid ${COLORS.borderSoft};border-radius:10px;padding:0 14px;">${rows}</table>`;
}

function renderCta(cta: { label: string; url: string }): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="background:${COLORS.navy};border-radius:10px;">
        <a href="${encodeURI(cta.url)}" style="display:inline-block;padding:13px 22px;font-family:${FONT_BODY};font-size:13px;font-weight:700;letter-spacing:0.06em;color:#ffffff;text-decoration:none;">${escapeHtml(cta.label)}</a>
      </td>
    </tr>
  </table>`;
}
