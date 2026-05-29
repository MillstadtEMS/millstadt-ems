import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { recordScore } from "@/lib/lounge/games/scores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_LEVELS = new Set(["beginner", "intermediate", "expert"]);

export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const level = typeof body.level === "string" && ALLOWED_LEVELS.has(body.level) ? body.level : "beginner";
  const rawScore = Number(body.score);
  if (!Number.isFinite(rawScore)) {
    return NextResponse.json({ error: "score must be a number" }, { status: 400 });
  }
  // Defensive cap — beginner round is ~10 questions @ ~50 pts max each plus streak/speed.
  const score = Math.max(0, Math.min(20000, rawScore));

  const details: Record<string, unknown> = {};
  if (typeof body.questionsAnswered === "number") details.questionsAnswered = body.questionsAnswered;
  if (typeof body.correct === "number") details.correct = body.correct;
  if (typeof body.wrong === "number") details.wrong = body.wrong;
  if (typeof body.durationMs === "number") details.durationMs = body.durationMs;

  await recordScore({
    playerId: me.id,
    game: "lead-ii",
    level,
    score,
    details,
  });
  return NextResponse.json({ ok: true });
}
