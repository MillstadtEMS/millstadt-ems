import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { myBestScore, topScores } from "@/lib/lounge/games/scores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const levelParam = req.nextUrl.searchParams.get("level");
  const level = levelParam === "intermediate" || levelParam === "expert" || levelParam === "beginner" ? levelParam : null;
  const [scores, myBest] = await Promise.all([
    topScores("lead-ii", level, 25),
    myBestScore(me.id, "lead-ii", level),
  ]);
  return NextResponse.json({ scores, myBest });
}
