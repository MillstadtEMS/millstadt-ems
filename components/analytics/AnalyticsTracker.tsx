"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Category = "aggregate" | "returning_visitor" | "broad_geography";
type EventName =
  | "page_view"
  | "engagement"
  | "performance"
  | "accessibility_control"
  | "read_aloud"
  | "print_selection"
  | "document_view"
  | "document_download"
  | "accessible_alternative"
  | "client_error";

const EXCLUDED = ["/admin", "/api", "/board", "/inventory", "/lounge", "/truckcheck"];

export default function AnalyticsTracker() {
  const pathname = usePathname() || "/";
  const [categories, setCategories] = useState<Category[]>([]);
  const categoriesRef = useRef<Category[]>([]);
  const pathRef = useRef(pathname);
  const startedAt = useRef(0);
  const performanceSent = useRef(false);

  useEffect(() => {
    startedAt.current = Date.now();
    categoriesRef.current = categories;
  }, [categories]);

  useEffect(() => {
    let active = true;
    fetch("/api/privacy/preferences", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { optionalAnalyticsEnabled?: boolean; preference?: { status?: string; categories?: Category[] } }) => {
        if (!active) return;
        setCategories(
          data.optionalAnalyticsEnabled && data.preference?.status === "allowed"
            ? data.preference.categories ?? []
            : [],
        );
      })
      .catch(() => undefined);
    const update = (event: Event) => {
      const detail = (event as CustomEvent<{ status?: string; categories?: Category[] }>).detail;
      setCategories(detail?.status === "allowed" ? detail.categories ?? [] : []);
    };
    window.addEventListener("millstadt:privacy-updated", update);
    return () => {
      active = false;
      window.removeEventListener("millstadt:privacy-updated", update);
    };
  }, []);

  useEffect(() => {
    pathRef.current = pathname;
    startedAt.current = Date.now();
    if (!categories.includes("aggregate") || isExcluded(pathname)) return;
    void send("page_view", pathname);
    const timer = window.setTimeout(() => {
      const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (navigation && !performanceSent.current) {
        performanceSent.current = true;
        void send("performance", pathname, { value: Math.round(navigation.duration) });
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [categories, pathname]);

  useEffect(() => {
    const recordEngagement = () => {
      if (!categoriesRef.current.includes("aggregate") || isExcluded(pathRef.current)) return;
      const durationMs = Math.min(24 * 60 * 60 * 1000, Math.max(0, Date.now() - startedAt.current));
      if (durationMs >= 1_000) void send("engagement", pathRef.current, { durationMs });
      startedAt.current = Date.now();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") recordEngagement();
      else startedAt.current = Date.now();
    };
    window.addEventListener("pagehide", recordEngagement);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", recordEngagement);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    const click = (event: MouseEvent) => {
      if (!categoriesRef.current.includes("aggregate")) return;
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-analytics-event]");
      if (!target || isExcluded(pathRef.current)) return;
      const eventName = target.dataset.analyticsEvent as EventName | undefined;
      if (!eventName) return;
      void send(eventName, pathRef.current, {
        documentKind: target.dataset.analyticsDocumentKind,
        documentId: target.dataset.analyticsDocumentId,
        control: target.dataset.analyticsControl,
      });
    };
    const error = () => {
      if (categoriesRef.current.includes("aggregate") && !isExcluded(pathRef.current)) {
        void send("client_error", pathRef.current, { control: "window_error" });
      }
    };
    document.addEventListener("click", click);
    window.addEventListener("error", error);
    return () => {
      document.removeEventListener("click", click);
      window.removeEventListener("error", error);
    };
  }, []);

  return null;
}

function isExcluded(path: string) {
  return EXCLUDED.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

async function send(eventName: EventName, path: string, details: Record<string, unknown> = {}) {
  const payload = Object.fromEntries(
    Object.entries({ eventName, path, occurredAt: new Date().toISOString(), ...details }).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  );
  let referrer = "";
  try {
    referrer = document.referrer ? new URL(document.referrer).origin : "";
  } catch {
    referrer = "";
  }
  await fetch("/api/analytics/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(referrer ? { "X-Analytics-Referrer": referrer } : {}),
    },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
}
