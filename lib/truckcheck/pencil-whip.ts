/**
 * Server-side pencil-whip detector.
 *
 * Looks at the submitted check + per-item timestamps and decides whether
 * the check should be marked Normal, Needs Review, or Possible Pencil Whip.
 * Reasons are surfaced individually so admins can see WHY a check was flagged.
 *
 * Designed to be additive: never blocks submission.
 */

export interface ItemForFlag {
  itemKey: string;
  label: string;
  category: string;
  responseType: string;
  status: string | null;
  numericValue: number | null;
  amountAdded: number | null;
  comment: string;
  checkedAt: string;  // ISO
  isAbnormal: boolean;
}

export interface FlagInput {
  startedAt: string | null;
  submittedAt: string;
  unit: string;
  items: ItemForFlag[];
  recentSameEmployeeFastCount?: number;  // optional history signal from caller
}

export interface FlagReason {
  code: string;
  message: string;
  severity: "info" | "warn" | "high";
}

export interface FlagResult {
  flag: "normal" | "review" | "possible_whip";
  durationSeconds: number;
  reasons: FlagReason[];
}

const TOO_FAST_TOTAL_SECONDS = 90;     // < 90s for a full check = suspicious
const TOO_FAST_PER_ITEM_MS = 700;      // < 0.7s between items in a streak
const BURST_STREAK = 6;                // 6+ items in <700ms apart = burst

export function detectPencilWhip(input: FlagInput): FlagResult {
  const reasons: FlagReason[] = [];
  const submitted = new Date(input.submittedAt).getTime();
  const started = input.startedAt ? new Date(input.startedAt).getTime() : submitted;
  const durationSeconds = Math.max(0, Math.round((submitted - started) / 1000));

  // 1. Total duration far too short for a real check.
  if (input.items.length >= 12 && durationSeconds < TOO_FAST_TOTAL_SECONDS) {
    reasons.push({
      code: "fast_total",
      severity: "high",
      message: `Whole check submitted in ${durationSeconds}s — too quick for ${input.items.length} items.`,
    });
  }

  // 2. Burst-tap detection: long streaks of items recorded within a fraction of a second.
  const ordered = [...input.items]
    .filter((i) => i.checkedAt)
    .sort((a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime());
  let streak = 1;
  for (let i = 1; i < ordered.length; i++) {
    const gap = new Date(ordered[i].checkedAt).getTime() - new Date(ordered[i - 1].checkedAt).getTime();
    if (gap < TOO_FAST_PER_ITEM_MS) {
      streak++;
      if (streak === BURST_STREAK) {
        reasons.push({
          code: "burst_taps",
          severity: "warn",
          message: `${BURST_STREAK} items recorded within ${TOO_FAST_PER_ITEM_MS}ms of each other — looks like rapid bulk-tap.`,
        });
      }
    } else {
      streak = 1;
    }
  }

  // 3. Abnormal status with no comment.
  const abnormalNoComment = input.items.filter(
    (i) => i.isAbnormal && (!i.comment || i.comment.trim().length === 0),
  );
  if (abnormalNoComment.length > 0) {
    reasons.push({
      code: "abnormal_no_comment",
      severity: "high",
      message: `${abnormalNoComment.length} abnormal item${abnormalNoComment.length === 1 ? "" : "s"} submitted without explanation: ${abnormalNoComment.slice(0, 3).map((i) => i.label).join(", ")}${abnormalNoComment.length > 3 ? "…" : ""}.`,
    });
  }

  // 4. Fluid "Filled" without amount/comment.
  const filledNoAmount = input.items.filter(
    (i) =>
      (i.responseType === "fluid") &&
      (i.status === "Filled" || i.status === "Added Oil") &&
      (i.amountAdded === null || i.amountAdded <= 0) &&
      (!i.comment || i.comment.trim().length === 0),
  );
  if (filledNoAmount.length > 0) {
    reasons.push({
      code: "filled_no_amount",
      severity: "warn",
      message: `Fluid marked filled with no amount entered: ${filledNoAmount.map((i) => i.label).join(", ")}.`,
    });
  }

  // 5. O₂ marked Pass but PSI below minimum (covered by abnormal but
  //    surfaced specifically because it's a safety-critical signal).
  const o2Issue = input.items.filter(
    (i) =>
      (i.itemKey === "main_o2_psi" || i.itemKey === "portable_o2_psi") &&
      i.numericValue !== null &&
      i.isAbnormal,
  );
  if (o2Issue.length > 0) {
    reasons.push({
      code: "o2_low",
      severity: "high",
      message: `Oxygen below minimum: ${o2Issue.map((i) => `${i.label} = ${i.numericValue} psi`).join("; ")}.`,
    });
  }

  // 6. Tire PSI outliers (more than one tire flagged abnormal).
  const tireAbnormal = input.items.filter(
    (i) => i.responseType === "tire_psi" && i.isAbnormal,
  );
  if (tireAbnormal.length >= 1) {
    reasons.push({
      code: "tire_abnormal",
      severity: tireAbnormal.length >= 2 ? "high" : "warn",
      message: `Tire pressure abnormal on ${tireAbnormal.length} position${tireAbnormal.length === 1 ? "" : "s"}: ${tireAbnormal.map((i) => `${i.label} ${i.numericValue ?? "?"} psi`).join("; ")}.`,
    });
  }

  // 7. Optional cross-check from caller: same employee has repeatedly
  //    submitted fast checks in recent history.
  if ((input.recentSameEmployeeFastCount ?? 0) >= 3) {
    reasons.push({
      code: "fast_history",
      severity: "high",
      message: `This employee has submitted ${input.recentSameEmployeeFastCount} unusually fast checks recently.`,
    });
  }

  let flag: FlagResult["flag"] = "normal";
  if (reasons.some((r) => r.severity === "high")) flag = "possible_whip";
  else if (reasons.length > 0) flag = "review";

  return { flag, durationSeconds, reasons };
}
