"use client";

import { useRouter } from "next/navigation";
import LeadIIGame from "./LeadIIGame";
import type { LevelId } from "@/lib/lounge/games/lead-ii/levels/levelRhythms";

export default function LeadIIRunner({ playerName, level }: { playerName: string; level: LevelId }) {
  const router = useRouter();
  return (
    <LeadIIGame
      playerName={playerName}
      level={level}
      onExit={() => router.push("/lounge/games")}
    />
  );
}
