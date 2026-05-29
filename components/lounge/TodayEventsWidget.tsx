"use client";

import { useEffect, useState } from "react";

interface TodayEvent {
  id: string;
  title: string;
  location: string | null;
  description: string | null;
  start: string;
  end: string;
  allDay: boolean;
  startLabel: string;
  endLabel: string;
}

export default function TodayEventsWidget() {
  const [events, setEvents] = useState<TodayEvent[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/lounge/today-events")
      .then((r) => r.ok ? r.json() : { events: [] })
      .then((d) => {
        if (cancelled) return;
        setEvents(Array.isArray(d.events) ? d.events : []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setEvents([]);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const today = new Date().toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <section style={{
      marginTop: 14,
      background: "linear-gradient(140deg, rgba(56,189,248,0.06), rgba(240,180,41,0.05))",
      border: "1px solid rgba(56,189,248,0.20)",
      borderLeft: "4px solid #38bdf8",
      borderRadius: 14,
      padding: "16px 18px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
        <div>
          <div style={{ color: "#7dd3fc", fontSize: 10.5, fontWeight: 900, letterSpacing: "0.20em", textTransform: "uppercase" }}>
            On the calendar today
          </div>
          <div style={{ color: "white", fontWeight: 800, fontSize: 16, marginTop: 2 }}>
            {today}
          </div>
        </div>
        <a
          href="/events"
          style={{ color: "#7dd3fc", fontSize: 11.5, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", textDecoration: "none", padding: "5px 11px", border: "1px solid rgba(56,189,248,0.30)", borderRadius: 999 }}
        >
          Full month →
        </a>
      </div>

      {loading ? (
        <p style={muted}>Loading…</p>
      ) : !events || events.length === 0 ? (
        <p style={{ ...muted, margin: 0 }}>
          Nothing on the public calendar today — quiet shift.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {events.map((ev) => (
            <li key={ev.id} style={row}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", minWidth: 0 }}>
                <div style={timePill(ev.allDay)}>
                  {ev.allDay ? "All day" : ev.startLabel}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 800, color: "white", fontSize: 14 }}>{ev.title}</div>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>
                    {!ev.allDay && (
                      <span>{ev.startLabel}{ev.endLabel ? ` – ${ev.endLabel}` : ""}</span>
                    )}
                    {ev.location && (
                      <span>{!ev.allDay ? " · " : ""}📍 {ev.location}</span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const muted: React.CSSProperties = { color: "#94a3b8", fontSize: 13.5, margin: 0 };
const row: React.CSSProperties = {
  padding: "10px 12px",
  background: "rgba(2,9,18,0.55)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 10,
};
function timePill(allDay: boolean): React.CSSProperties {
  return {
    flexShrink: 0,
    padding: "4px 10px",
    background: allDay ? "rgba(240,180,41,0.15)" : "rgba(56,189,248,0.12)",
    color: allDay ? "#f0b429" : "#7dd3fc",
    border: `1px solid ${allDay ? "rgba(240,180,41,0.30)" : "rgba(56,189,248,0.25)"}`,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.08em",
    minWidth: 70,
    textAlign: "center",
    whiteSpace: "nowrap",
  };
}
