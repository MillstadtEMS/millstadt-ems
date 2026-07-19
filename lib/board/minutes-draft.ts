import type { Meeting } from "./governance";

const PROFANITY_PATTERN = String.raw`\b(?:fuck(?:ing|er|ed)?|shit(?:ty)?|asshole|bitch(?:ing)?|bastard|damn|crap|dick|prick|piss|bullshit|jackass)\b`;
const PROFANITY_RE = new RegExp(PROFANITY_PATTERN, "gi");
const PROFANITY_TEST_RE = new RegExp(PROFANITY_PATTERN, "i");
const BANTER_RE = /\b(?:joke|kidding|laughing|laughter|off the record|banter|funny story|remember when|bar|beer|drunk|hangover|stupid|idiot|dumb)\b/i;
const BOARD_SIGNAL_RE = /\b(?:motion|second|vote|approved|denied|passed|failed|table|agenda|minutes|treasurer|budget|levy|billing|emsmc|mediclaims|staffing|ambulance|station|equipment|policy|public comment|adjourn|call to order|roll call|report|contract|invoice|action item|follow up|next meeting)\b/i;
const UNRESOLVED_FINAL_RE = /\b(?:draft meeting minutes|secretary review required|secretary to verify|no specific item captured|confirm names|remove any item that was not board business)\b/i;

export function sanitizeMinutesText(input: string): string {
  return input
    .split(/\r?\n/)
    .map((line) => line.replace(PROFANITY_RE, "").replace(/\s{2,}/g, " ").trim())
    .filter((line) => line.length > 0 && !BANTER_RE.test(line))
    .join("\n")
    .trim();
}

export function hasDisallowedMinutesLanguage(input: string): boolean {
  return PROFANITY_TEST_RE.test(input) || input.split(/\r?\n/).some((line) => BANTER_RE.test(line) && !BOARD_SIGNAL_RE.test(line));
}

export function hasUnresolvedMinutesPlaceholders(input: string): boolean {
  return UNRESOLVED_FINAL_RE.test(input);
}

export function prepareOfficialMinutesText(input: string): string {
  const sanitized = sanitizeMinutesText(input);
  const cleaned: string[] = [];
  let skippingReviewNotes = false;

  for (const rawLine of sanitized.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      if (cleaned.length > 0 && cleaned[cleaned.length - 1] !== "") cleaned.push("");
      continue;
    }

    if (/^DRAFT MEETING MINUTES\b/i.test(line)) continue;
    if (/^(Meeting|Date|Time|Location|Draft prepared by):/i.test(line)) continue;
    if (/^Secretary review notes:?$/i.test(line)) {
      skippingReviewNotes = true;
      continue;
    }
    if (skippingReviewNotes) {
      if (/^\d+\.\s+/.test(line)) skippingReviewNotes = false;
      else continue;
    }
    cleaned.push(line);
  }

  return cleaned.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function sentenceFragments(raw: string): string[] {
  return raw
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function cleanFragment(fragment: string): string | null {
  const withoutProfanity = fragment.replace(PROFANITY_RE, "").replace(/\s{2,}/g, " ").trim();
  if (!withoutProfanity) return null;
  if (BANTER_RE.test(withoutProfanity) && !BOARD_SIGNAL_RE.test(withoutProfanity)) return null;
  return withoutProfanity.replace(/^\w+:\s*/, "").trim();
}

function unique(lines: string[], limit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
    if (out.length >= limit) break;
  }
  return out;
}

function bullet(lines: string[]): string {
  if (lines.length === 0) return "- No specific item captured in the transcript. Secretary to verify.";
  return lines.map((line) => `- ${line.replace(/[. ]+$/, ".")}`).join("\n");
}

export function buildDraftMinutesFromTranscript(input: { meeting: Meeting; transcript: string; preparedBy: string }): string {
  const fragments = sentenceFragments(input.transcript).map(cleanFragment).filter((line): line is string => Boolean(line));
  const boardRelevant = fragments.filter((line) => BOARD_SIGNAL_RE.test(line));
  const motions = unique(fragments.filter((line) => /\b(motion|second|vote|approved|denied|passed|failed)\b/i.test(line)), 12);
  const actions = unique(fragments.filter((line) => /\b(will|follow up|action item|responsible|next step|before next|send|prepare|review|contact|update)\b/i.test(line)), 12);
  const discussion = unique(boardRelevant.filter((line) => !motions.includes(line) && !actions.includes(line)), 18);
  const callToOrder = fragments.find((line) => /\b(call(?:ed)? to order|meeting began|start(?:ed)? the meeting)\b/i.test(line));
  const adjournment = fragments.find((line) => /\b(adjourn|meeting ended|meeting closed)\b/i.test(line));

  const lines = [
    "DRAFT MEETING MINUTES - SECRETARY REVIEW REQUIRED",
    "",
    `Meeting: ${input.meeting.title ?? "Millstadt EMS Board Meeting"}`,
    `Date: ${input.meeting.date}`,
    `Time: ${input.meeting.startTime ?? "Time not confirmed"}${input.meeting.endTime ? ` - ${input.meeting.endTime}` : ""}`,
    `Location: ${input.meeting.location ?? "Location not confirmed"}`,
    `Draft prepared by: ${input.preparedBy}`,
    "",
    "1. Call to Order",
    callToOrder ? `- ${callToOrder.replace(/[. ]+$/, ".")}` : "- Secretary to verify the time the meeting was called to order.",
    "",
    "2. Attendance",
    "- Secretary to verify official attendance using the confirmed attendance record.",
    "",
    "3. Reports and Discussion",
    bullet(discussion),
    "",
    "4. Motions, Seconds, and Votes",
    bullet(motions),
    "",
    "5. Action Items",
    bullet(actions),
    "",
    "6. Adjournment",
    adjournment ? `- ${adjournment.replace(/[. ]+$/, ".")}` : "- Secretary to verify adjournment time.",
    "",
    "Secretary review notes:",
    "- Remove any item that was not board business.",
    "- Confirm names, motions, seconds, vote counts, attendance, and adjournment before signing.",
  ];

  return sanitizeMinutesText(lines.join("\n"));
}
