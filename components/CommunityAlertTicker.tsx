"use client";

import Image from "next/image";
import { CalendarDays, ExternalLink, Flag, GraduationCap, Telescope, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CommunityAlert,
  CommunityAlertBrand,
  CommunityAlertKind,
} from "@/lib/community/alerts";

const DISMISSED_KEY = "mems-dismissed-community-alerts";

type BrandStyle = {
  label: string;
  logo?: string;
  primary: string;
  secondary: string;
};

const TEAM_STYLES: Record<Exclude<CommunityAlertBrand, "generic">, BrandStyle> = {
  cardinals: {
    label: "St. Louis Cardinals",
    logo: "/images/community-alerts/cardinals.png",
    primary: "#e33243",
    secondary: "#ffd400",
  },
  blues: {
    label: "St. Louis Blues",
    logo: "/images/community-alerts/blues.png",
    primary: "#4b8cff",
    secondary: "#fcb514",
  },
  "city-sc": {
    label: "St. Louis CITY SC",
    logo: "/images/community-alerts/city-sc.png",
    primary: "#e8004d",
    secondary: "#7cc9ff",
  },
  "millstadt-ccsd": {
    label: "Millstadt CCSD Panthers",
    logo: "/images/community-alerts/millstadt-ccsd.png",
    primary: "#c51f2f",
    secondary: "#ffffff",
  },
  "st-james": {
    label: "St. James Catholic",
    logo: "/images/community-alerts/st-james.png",
    primary: "#d6c39a",
    secondary: "#ffffff",
  },
  "belleville-west": {
    label: "Belleville West",
    logo: "/images/community-alerts/belleville-west.png",
    primary: "#c22b4c",
    secondary: "#ffffff",
  },
  "sky-meteor": {
    label: "Meteor Shower",
    logo: "/images/community-alerts/sky-meteor.png",
    primary: "#38bdf8",
    secondary: "#f0b429",
  },
  "sky-eclipse": {
    label: "Eclipse",
    logo: "/images/community-alerts/sky-eclipse.png",
    primary: "#93c5fd",
    secondary: "#f8d980",
  },
  "sky-conjunction": {
    label: "Night Sky Event",
    logo: "/images/community-alerts/sky-conjunction.png",
    primary: "#67e8f9",
    secondary: "#f0b429",
  },
};

function genericStyle(kind: CommunityAlertKind): BrandStyle {
  if (kind === "flag") return { label: "Flag Notice", primary: "#f0b429", secondary: "#ffffff" };
  if (kind === "school") return { label: "School Notice", primary: "#4ade80", secondary: "#ffffff" };
  if (kind === "sky") return { label: "Millstadt Sky", primary: "#22d3ee", secondary: "#ffffff" };
  return { label: "Community Event", primary: "#a78bfa", secondary: "#ffffff" };
}

function GenericIcon({ kind }: { kind: CommunityAlertKind }) {
  const className = "h-6 w-6";
  if (kind === "flag") return <Flag className={className} aria-hidden="true" />;
  if (kind === "school") return <GraduationCap className={className} aria-hidden="true" />;
  if (kind === "sky") return <Telescope className={className} aria-hidden="true" />;
  return <CalendarDays className={className} aria-hidden="true" />;
}

function stateLabel(alert: CommunityAlert) {
  if (alert.state === "live") return "Live";
  if (alert.state === "final") return "Final";
  if (alert.state === "active") return "Active";
  return "Today";
}

function groupCountLabel(alert: CommunityAlert, count: number) {
  if (alert.kind === "sports") return `${count} games today`;
  if (alert.kind === "school" || alert.kind === "event") return `${count} events today`;
  if (alert.kind === "sky") return `${count} sky events`;
  return `${count} active notices`;
}

function groupItemLabel(kind: CommunityAlertKind, index: number) {
  if (kind === "sports") return `Game ${index + 1}`;
  if (kind === "school" || kind === "event") return `Event ${index + 1}`;
  return `Notice ${index + 1}`;
}

export default function CommunityAlertTicker() {
  const [alerts, setAlerts] = useState<CommunityAlert[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.sessionStorage.getItem(DISMISSED_KEY);
        if (stored) setDismissed(JSON.parse(stored) as string[]);
      } catch {
        setDismissed([]);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const response = await fetch("/api/public/community-alerts", { cache: "no-store" });
        if (!response.ok) return;
        const body = await response.json() as { alerts?: CommunityAlert[] };
        if (active && Array.isArray(body.alerts)) setAlerts(body.alerts);
      } catch {
        // A failed source stays silent and never becomes a made-up public alert.
      }
    }

    void refresh();
    const timer = window.setInterval(refresh, 5 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!openGroup) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpenGroup(null);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenGroup(null);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openGroup]);

  const groups = useMemo(() => {
    const grouped = new Map<string, CommunityAlert[]>();
    for (const alert of alerts) {
      if (dismissed.includes(alert.id)) continue;
      const key = alert.brand === "generic" ? `generic-${alert.kind}` : alert.brand;
      grouped.set(key, [...(grouped.get(key) ?? []), alert]);
    }
    return [...grouped.entries()].map(([key, items]) => ({ key, items }));
  }, [alerts, dismissed]);
  const density = groups.length >= 5 ? "dense" : groups.length >= 3 ? "compact" : "normal";

  function dismiss(id: string) {
    const next = [...new Set([...dismissed, id])];
    setDismissed(next);
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    } catch {
      // Session storage can be unavailable in strict privacy modes.
    }
  }

  if (groups.length === 0) return null;

  return (
    <div
      ref={rootRef}
      className="community-team-alerts flex min-w-0 items-center overflow-visible"
      aria-label="Active community alerts"
      data-density={density}
    >
      {groups.map(({ key, items }) => {
        const first = items[0];
        const style = first.brand === "generic" ? genericStyle(first.kind) : TEAM_STYLES[first.brand];
        const isOpen = openGroup === key;

        return (
          <div
            key={key}
            className="community-team-alert-root relative shrink-0"
            onMouseEnter={() => setOpenGroup(key)}
            onMouseLeave={() => setOpenGroup(null)}
            onFocusCapture={() => setOpenGroup(key)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpenGroup(null);
            }}
          >
            <button
              type="button"
              className="community-team-alert-button flex h-14 w-14 items-center justify-center overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#020912]"
              style={{ "--team-color": style.primary } as React.CSSProperties}
              aria-label={`${style.label}: ${items.length} ${items.length === 1 ? "alert" : "alerts"}`}
              aria-expanded={isOpen}
              aria-haspopup="dialog"
              title={`${style.label} details`}
              onClick={() => setOpenGroup(key)}
            >
              {style.logo ? (
                <Image
                  src={style.logo}
                  alt=""
                  width={52}
                  height={52}
                  className="h-12 w-12 object-contain"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-current/30 bg-black/25" style={{ color: style.primary }}>
                  <GenericIcon kind={first.kind} />
                </span>
              )}
            </button>

            {isOpen ? (
              <div
                role="dialog"
                aria-label={`${style.label} details`}
                className="fixed left-3 right-3 top-[124px] z-[90] overflow-hidden rounded-lg border border-white/12 bg-[#06101f]/[0.98] text-left shadow-2xl shadow-black/65 backdrop-blur-xl sm:absolute sm:left-0 sm:right-auto sm:top-[calc(100%+9px)] sm:w-[420px]"
                style={{ borderTopColor: style.primary, borderTopWidth: 3 }}
              >
                <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                  {style.logo ? <Image src={style.logo} alt="" width={36} height={36} className="h-9 w-9 object-contain" /> : <GenericIcon kind={first.kind} />}
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-black" style={{ color: style.primary }}>{style.label}</h2>
                    <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.1em]" style={{ color: style.secondary }}>
                      {items.length === 1 ? stateLabel(first) : groupCountLabel(first, items.length)}
                    </p>
                  </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                  {items.map((alert, itemIndex) => {
                    const external = alert.sourceUrl.startsWith("http");
                    return (
                      <article key={alert.id} className="grid grid-cols-[1fr_32px] gap-3 border-b border-white/8 px-4 py-4 last:border-b-0">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <span className="text-[9px] font-black uppercase tracking-[0.1em]" style={{ color: style.primary }}>
                              {items.length > 1 ? groupItemLabel(alert.kind, itemIndex) : stateLabel(alert)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-black leading-5 text-white">{alert.summary}</p>
                          {alert.detail ? <p className="mt-1 text-[11px] leading-5 text-slate-400">{alert.detail}</p> : null}
                          <a
                            href={alert.sourceUrl}
                            target={external ? "_blank" : undefined}
                            rel={external ? "noreferrer" : undefined}
                            className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.08em] underline decoration-white/25 underline-offset-4 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                            style={{ color: style.secondary }}
                          >
                            {alert.sourceName}
                            {external ? <ExternalLink className="h-3 w-3" aria-hidden="true" /> : null}
                          </a>
                        </div>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                          onClick={() => dismiss(alert.id)}
                          title="Dismiss for this session"
                          aria-label={`Dismiss ${alert.summary} for this session`}
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
