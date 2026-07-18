"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function out() {
    setBusy(true);
    try { await fetch("/api/board/logout", { method: "POST" }); } catch { /* ignore */ }
    router.push("/board/login");
    router.refresh();
  }
  return (
    <button className="board-btn-ghost" onClick={out} disabled={busy} aria-label="Sign out">
      {busy ? "…" : "Sign out"}
    </button>
  );
}
