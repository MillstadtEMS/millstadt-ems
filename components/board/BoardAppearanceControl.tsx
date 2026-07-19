"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Appearance = "system" | "light" | "dark";

const OPTIONS: Array<{ value: Appearance; label: string; icon: typeof Monitor }> = [
  { value: "system", label: "Automatic", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

function applyAppearance(value: Appearance) {
  const root = document.querySelector<HTMLElement>(".board-root");
  if (!root) return;
  if (value === "system") root.removeAttribute("data-b-theme");
  else root.setAttribute("data-b-theme", value);
}

export default function BoardAppearanceControl({ compact = false }: { compact?: boolean }) {
  const [appearance, setAppearance] = useState<Appearance>("system");

  useEffect(() => {
    const saved = window.localStorage.getItem("board_appearance") as Appearance | null;
    const next = saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
    setAppearance(next);
    applyAppearance(next);
  }, []);

  function choose(value: Appearance) {
    setAppearance(value);
    window.localStorage.setItem("board_appearance", value);
    applyAppearance(value);
  }

  return (
    <div className={compact ? "board-appearance compact" : "board-appearance"} role="group" aria-label="Appearance">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          className={appearance === value ? "on" : ""}
          onClick={() => choose(value)}
          aria-pressed={appearance === value}
          title={label}
        >
          <Icon size={16} aria-hidden="true" />
          {!compact && <span>{label}</span>}
        </button>
      ))}
    </div>
  );
}
