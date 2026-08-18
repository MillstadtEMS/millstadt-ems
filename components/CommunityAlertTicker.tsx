"use client";

import Image from "next/image";
import { CalendarDays, Ellipsis, ExternalLink, Flag, GraduationCap, Telescope, X } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CommunityAlert,
  CommunityAlertBrand,
  CommunityAlertKind,
} from "@/lib/community/alerts";
import {
  communityVisibleGroupLimit,
  pruneExpiredAlerts,
} from "@/lib/community/reliability";

const DISMISSED_KEY = "mems-dismissed-community-alerts";

type BrandStyle = {
  label: string;
  logo?: string;
  logoScale?: number;
  primary: string;
  secondary: string;
};

type CommunityAlertContextValue = {
  alerts: CommunityAlert[];
  dismissed: string[];
  dismiss: (id: string) => void;
};

const CommunityAlertContext = createContext<CommunityAlertContextValue | null>(null);
const EMPTY_ALERTS: CommunityAlert[] = [];
const EMPTY_DISMISSED: string[] = [];
const NOOP_DISMISS = () => undefined;

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
    logoScale: 1.55,
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

export function CommunityAlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<CommunityAlert[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

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
    let refreshTimer: number | undefined;

    async function refresh() {
      let refreshInMs = 5 * 60 * 1000;
      try {
        const response = await fetch("/api/public/community-alerts", { cache: "no-store" });
        if (response.ok) {
          const body = await response.json() as { alerts?: CommunityAlert[] };
          if (active && Array.isArray(body.alerts)) {
            const currentAlerts = pruneExpiredAlerts(body.alerts);
            setAlerts(currentAlerts);
            if (currentAlerts.some((alert) => alert.state === "live")) refreshInMs = 30 * 1000;
          }
        }
      } catch {
        // A failed source stays silent and never becomes a made-up public alert.
      } finally {
        if (active) refreshTimer = window.setTimeout(refresh, refreshInMs);
      }
    }

    void refresh();
    const pruneTimer = window.setInterval(() => {
      setAlerts((current) => pruneExpiredAlerts(current));
    }, 15 * 1000);
    return () => {
      active = false;
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
      window.clearInterval(pruneTimer);
    };
  }, []);

  function dismiss(id: string) {
    setDismissed((current) => {
      const next = [...new Set([...current, id])];
      try {
        window.sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
      } catch {
        // Session storage can be unavailable in strict privacy modes.
      }
      return next;
    });
  }

  return (
    <CommunityAlertContext.Provider value={{ alerts, dismissed, dismiss }}>
      {children}
    </CommunityAlertContext.Provider>
  );
}

export default function CommunityAlertTicker({ placement }: { placement: "left" | "right" }) {
  const context = useContext(CommunityAlertContext);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const alerts = context?.alerts ?? EMPTY_ALERTS;
  const dismissed = context?.dismissed ?? EMPTY_DISMISSED;
  const dismiss = context?.dismiss ?? NOOP_DISMISS;

  useEffect(() => {
    function updateVisibleLimit() {
      setVisibleLimit(communityVisibleGroupLimit(window.innerWidth));
    }

    updateVisibleLimit();
    window.addEventListener("resize", updateVisibleLimit);
    return () => window.removeEventListener("resize", updateVisibleLimit);
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
  const placedGroups = groups.filter((_, index) => index % 2 === (placement === "left" ? 0 : 1));
  const visibleGroups = placedGroups.slice(0, visibleLimit);
  const overflowGroups = placedGroups.slice(visibleLimit);
  const overflowOpen = openGroup === "overflow" && overflowGroups.length > 0;

  if (placedGroups.length === 0 || visibleLimit === 0) return null;

  return (
    <div
      ref={rootRef}
      className="community-team-alerts hidden min-w-0 items-center overflow-visible md:flex"
      aria-label="Active community alerts"
      data-placement={placement}
    >
      {visibleGroups.map(({ key, items }) => {
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
                  style={style.logoScale ? { transform: `scale(${style.logoScale})` } : undefined}
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
                  {style.logo ? (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden">
                      <Image
                        src={style.logo}
                        alt=""
                        width={36}
                        height={36}
                        className="h-9 w-9 object-contain"
                        style={style.logoScale ? { transform: `scale(${style.logoScale})` } : undefined}
                      />
                    </span>
                  ) : (
                    <GenericIcon kind={first.kind} />
                  )}
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

      {overflowGroups.length > 0 ? (
        <div
          className="community-team-alert-root relative shrink-0"
          onFocusCapture={() => setOpenGroup("overflow")}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpenGroup(null);
          }}
        >
          <button
            type="button"
            className="community-team-alert-overflow relative flex h-12 w-10 items-center justify-center rounded-md border border-white/15 bg-white/5 text-slate-200 outline-none transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#020912]"
            aria-label={`Show ${overflowGroups.length} more community alert ${overflowGroups.length === 1 ? "group" : "groups"}`}
            aria-expanded={overflowOpen}
            aria-haspopup="dialog"
            title="More community alerts"
            onClick={() => setOpenGroup("overflow")}
          >
            <Ellipsis className="h-5 w-5" aria-hidden="true" />
            <span className="absolute right-0.5 top-0.5 min-w-3 text-center text-[8px] font-black leading-3" aria-hidden="true">
              {overflowGroups.length}
            </span>
          </button>

          {overflowOpen ? (
            <div
              role="dialog"
              aria-label="More community alert details"
              className={`fixed left-3 right-3 top-[124px] z-[90] max-h-[70vh] overflow-y-auto rounded-lg border border-white/12 border-t-2 border-t-slate-300 bg-[#06101f]/[0.98] text-left shadow-2xl shadow-black/65 backdrop-blur-xl sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+9px)] sm:w-[420px] ${placement === "left" ? "sm:left-0 sm:right-auto" : ""}`}
            >
              <div className="border-b border-white/10 px-4 py-3">
                <h2 className="text-sm font-black text-white">More community alerts</h2>
                <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">
                  {overflowGroups.length} additional {overflowGroups.length === 1 ? "source" : "sources"}
                </p>
              </div>

              {overflowGroups.map(({ key, items }) => {
                const first = items[0];
                const style = first.brand === "generic" ? genericStyle(first.kind) : TEAM_STYLES[first.brand];
                return (
                  <section key={key} aria-label={style.label} className="border-b border-white/10 last:border-b-0">
                    <div className="flex items-center gap-3 px-4 py-3">
                      {style.logo ? (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden">
                          <Image
                            src={style.logo}
                            alt=""
                            width={36}
                            height={36}
                            className="h-9 w-9 object-contain"
                            style={style.logoScale ? { transform: `scale(${style.logoScale})` } : undefined}
                          />
                        </span>
                      ) : (
                        <GenericIcon kind={first.kind} />
                      )}
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black" style={{ color: style.primary }}>{style.label}</h3>
                        <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.1em]" style={{ color: style.secondary }}>
                          {items.length === 1 ? stateLabel(first) : groupCountLabel(first, items.length)}
                        </p>
                      </div>
                    </div>

                    {items.map((alert, itemIndex) => {
                      const external = alert.sourceUrl.startsWith("http");
                      return (
                        <article key={alert.id} className="grid grid-cols-[1fr_32px] gap-3 border-t border-white/8 px-4 py-4">
                          <div className="min-w-0">
                            <span className="text-[9px] font-black uppercase tracking-[0.1em]" style={{ color: style.primary }}>
                              {items.length > 1 ? groupItemLabel(alert.kind, itemIndex) : stateLabel(alert)}
                            </span>
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
                  </section>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
