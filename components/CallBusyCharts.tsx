"use client";

/**
 * Busiest-times charts — hour-of-day and day-of-week call distributions.
 * Pure presentation off two arrays (byHour[24], byDow[7]) the server
 * computes from dispatch date/time, so it stays live as the parent
 * re-polls. Shared by the public /statistics page and the admin reports.
 */

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function fmtHour(h: number) {
  const ap = h < 12 ? "AM" : "PM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${ap}`;
}
function hourRange(h: number) {
  return `${fmtHour(h)}–${fmtHour((h + 1) % 24)}`;
}

export default function CallBusyCharts({ byHour, byDow, accent = "#f0b429" }: { byHour: number[]; byDow: number[]; accent?: string }) {
  const hours = byHour.length === 24 ? byHour : new Array(24).fill(0);
  const days = byDow.length === 7 ? byDow : new Array(7).fill(0);
  const hourMax = Math.max(1, ...hours);
  const dayMax = Math.max(1, ...days);
  const totalHours = hours.reduce((a, b) => a + b, 0);
  const peakHour = totalHours ? hours.indexOf(Math.max(...hours)) : -1;
  const peakDow = days.some((d) => d > 0) ? days.indexOf(Math.max(...days)) : -1;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
      {/* ── Busiest hours ── */}
      <section style={card}>
        <Head title="Busiest hours" sub={peakHour >= 0 ? `Peak ${hourRange(peakHour)} · ${hours[peakHour]} calls` : "No data yet"} accent={accent} />
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 132, marginTop: 4 }}>
          {hours.map((n, h) => (
            <div key={h} title={`${hourRange(h)} · ${n} call${n === 1 ? "" : "s"}`} style={{ flex: 1, display: "flex", alignItems: "flex-end", height: "100%" }}>
              <div
                style={{
                  width: "100%",
                  height: `${Math.max(n > 0 ? 6 : 2, (n / hourMax) * 100)}%`,
                  background: h === peakHour ? accent : "linear-gradient(180deg, rgba(125,211,252,0.55), rgba(125,211,252,0.18))",
                  borderRadius: "3px 3px 0 0",
                  transition: "height 0.3s ease",
                }}
              />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, color: "#64748b", fontSize: 10, fontVariantNumeric: "tabular-nums" }}>
          <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span>
        </div>
      </section>

      {/* ── Busiest days ── */}
      <section style={card}>
        <Head title="Busiest days" sub={peakDow >= 0 ? `${DOW_LONG[peakDow]} · ${days[peakDow]} calls` : "No data yet"} accent={accent} />
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 132, marginTop: 4 }}>
          {days.map((n, d) => (
            <div key={d} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
              <span style={{ color: d === peakDow ? "white" : "#94a3b8", fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums", marginBottom: 3 }}>{n}</span>
              <div
                title={`${DOW_LONG[d]} · ${n} call${n === 1 ? "" : "s"}`}
                style={{
                  width: "100%",
                  height: `${Math.max(n > 0 ? 8 : 3, (n / dayMax) * 88)}%`,
                  background: d === peakDow ? accent : "linear-gradient(180deg, rgba(134,239,172,0.5), rgba(134,239,172,0.16))",
                  borderRadius: "4px 4px 0 0",
                  transition: "height 0.3s ease",
                }}
              />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          {DOW.map((d, i) => (
            <span key={d} style={{ flex: 1, textAlign: "center", color: i === peakDow ? accent : "#64748b", fontSize: 11, fontWeight: i === peakDow ? 700 : 500 }}>{d}</span>
          ))}
        </div>
      </section>
    </div>
  );
}

function Head({ title, sub, accent }: { title: string; sub: string; accent: string }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <h3 style={{ color: accent, fontSize: 13, fontWeight: 700, margin: 0, letterSpacing: "0.01em" }}>{title}</h3>
      <div style={{ color: "#94a3b8", fontSize: 11.5, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#071428", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16,
};
