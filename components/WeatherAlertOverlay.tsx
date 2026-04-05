"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const NWS_HEADERS = {
  "User-Agent": "(millstadtems.org, millstadtems@gmail.com)",
  Accept: "application/geo+json",
};

type AlertLevel = "clear" | "thunderstorm_watch" | "thunderstorm_warning" | "tornado_watch" | "tornado_pds_watch" | "tornado_warning" | "tornado_emergency";

function isPDS(a: { properties: { headline?: string; description?: string } }) {
  const h = ((a.properties.headline ?? "") + " " + (a.properties.description ?? "")).toLowerCase();
  return h.includes("particularly dangerous situation") || h.includes("pds tornado watch");
}

function isEmergency(a: { properties: { headline?: string; description?: string } }) {
  const h = ((a.properties.headline ?? "") + " " + (a.properties.description ?? "")).toLowerCase();
  return h.includes("tornado emergency");
}

function classifyAlerts(alerts: { properties: { event: string; headline?: string; description?: string } }[]): AlertLevel {
  // Highest priority first
  for (const a of alerts) {
    const e = a.properties.event.toLowerCase();
    if (e.includes("tornado") && e.includes("warning") && isEmergency(a)) return "tornado_emergency";
  }
  for (const a of alerts) {
    const e = a.properties.event.toLowerCase();
    if (e.includes("tornado") && e.includes("warning")) return "tornado_warning";
  }
  for (const a of alerts) {
    const e = a.properties.event.toLowerCase();
    if (e.includes("tornado") && e.includes("watch") && isPDS(a)) return "tornado_pds_watch";
  }
  for (const a of alerts) {
    const e = a.properties.event.toLowerCase();
    if (e.includes("tornado") && e.includes("watch")) return "tornado_watch";
  }
  for (const a of alerts) {
    const e = a.properties.event.toLowerCase();
    if ((e.includes("thunder") || e.includes("storm")) && e.includes("warning")) return "thunderstorm_warning";
  }
  for (const a of alerts) {
    const e = a.properties.event.toLowerCase();
    if ((e.includes("thunder") || e.includes("storm")) && e.includes("watch")) return "thunderstorm_watch";
  }
  return "clear";
}

const LEVEL_RANK: Record<AlertLevel, number> = {
  clear: 0,
  thunderstorm_watch: 1,
  thunderstorm_warning: 2,
  tornado_watch: 3,
  tornado_pds_watch: 4,
  tornado_warning: 5,
  tornado_emergency: 6,
};

// ── Web Audio tone generators ────────────────────────────────────────────────

function playThunderSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    // White noise burst shaped into a thunder crack + rumble
    const sampleRate = ctx.sampleRate;
    const duration = 2.5;
    const buf = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = t < 0.05
        ? t / 0.05                               // sharp attack
        : Math.exp(-3.5 * (t - 0.05));           // long decay
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 200;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1.2, ctx.currentTime);

    src.connect(lp);
    lp.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  } catch { /* AudioContext blocked, skip */ }
}

function playPDSSiren() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const duration = 4.5;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sawtooth";
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime + duration - 0.2);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    // Rapid urgent triple-beep pattern
    const period = 0.45;
    for (let t = 0; t < duration; t += period * 3) {
      osc.frequency.setValueAtTime(1100, ctx.currentTime + t);
      osc.frequency.setValueAtTime(800,  ctx.currentTime + t + period);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + t + period * 2);
    }
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch { /* skip */ }
}

function playWarningSiren(type: "watch" | "warning") {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const duration = type === "warning" ? 5 : 3;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sawtooth";
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.25, ctx.currentTime + duration - 0.2);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

    if (type === "warning") {
      // Wailing siren — ramp up and down
      const period = 0.9;
      for (let t = 0; t < duration; t += period) {
        osc.frequency.setValueAtTime(600, ctx.currentTime + t);
        osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + t + period * 0.5);
        osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + t + period);
      }
    } else {
      // Watch — two-tone beep pattern
      const period = 0.6;
      for (let t = 0; t < duration; t += period) {
        osc.frequency.setValueAtTime(880, ctx.currentTime + t);
        osc.frequency.setValueAtTime(660, ctx.currentTime + t + period * 0.5);
      }
    }

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch { /* skip */ }
}

// ── Rain drops ────────────────────────────────────────────────────────────────

function RainLayer() {
  const drops = Array.from({ length: 80 }, (_, i) => ({
    left: `${Math.random() * 110 - 5}%`,
    height: `${60 + Math.random() * 80}px`,
    delay: `${Math.random() * 2}s`,
    duration: `${0.5 + Math.random() * 0.6}s`,
    opacity: 0.3 + Math.random() * 0.5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {drops.map((d, i) => (
        <div
          key={i}
          className="rain-drop"
          style={{
            left: d.left,
            height: d.height,
            top: "-100px",
            animationDelay: d.delay,
            animationDuration: d.duration,
            opacity: d.opacity,
          }}
        />
      ))}
    </div>
  );
}

// ── Tornado SVG ───────────────────────────────────────────────────────────────

function TornadoSVG() {
  return (
    <svg viewBox="0 0 120 240" width={120} height={240} className="funnel-spin" aria-hidden>
      <defs>
        <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#475569" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {/* Funnel bands — widest at top, narrows to tip */}
      {[
        { y: 0,   w: 120, h: 28 },
        { y: 26,  w: 96,  h: 28 },
        { y: 52,  w: 74,  h: 28 },
        { y: 78,  w: 54,  h: 28 },
        { y: 104, w: 36,  h: 28 },
        { y: 130, w: 22,  h: 28 },
        { y: 156, w: 12,  h: 28 },
        { y: 182, w: 5,   h: 28 },
        { y: 208, w: 2,   h: 20 },
      ].map((b, i) => (
        <rect
          key={i}
          x={(120 - b.w) / 2}
          y={b.y}
          width={b.w}
          height={b.h}
          rx={b.w / 2}
          fill="url(#tg)"
          opacity={0.7 + i * 0.02}
        />
      ))}
    </svg>
  );
}

// ── Thunderstorm cloud + bolt SVG ─────────────────────────────────────────────

function ThunderstormSVG() {
  return (
    <div className="relative cloud-in">
      {/* Cloud */}
      <svg viewBox="0 0 200 100" width={220} height={110} className="drop-shadow-2xl" aria-hidden>
        <defs>
          <radialGradient id="cg" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
        </defs>
        <ellipse cx="80" cy="65" rx="68" ry="32" fill="url(#cg)" />
        <circle cx="55" cy="55" r="28" fill="url(#cg)" />
        <circle cx="95" cy="48" r="34" fill="url(#cg)" />
        <circle cx="140" cy="58" r="24" fill="url(#cg)" />
      </svg>
      {/* Lightning bolt */}
      <svg
        viewBox="0 0 40 90"
        width={50}
        height={100}
        className="bolt-pulse absolute"
        style={{ top: "55px", left: "85px" }}
        aria-hidden
      >
        <polygon points="24,0 8,48 20,48 16,90 32,34 20,34" fill="#facc15" />
      </svg>
    </div>
  );
}

// ── Main overlay component ────────────────────────────────────────────────────

export default function WeatherAlertOverlay() {
  const [visible, setVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [level, setLevel] = useState<AlertLevel>("clear");
  const prevLevelRef = useRef<AlertLevel>("clear");
  const shownRef = useRef<Set<AlertLevel>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dismiss = useCallback(() => {
    setDismissing(true);
    setTimeout(() => {
      setVisible(false);
      setDismissing(false);
    }, 500);
  }, []);

  const fetchAndCheck = useCallback(async () => {
    try {
      const res = await fetch("https://api.weather.gov/alerts/active?zone=ILC163", { headers: NWS_HEADERS });
      if (!res.ok) return;
      const data = await res.json();
      const currentLevel = classifyAlerts(data.features ?? []);

      setLevel(currentLevel);

      // Trigger animation only when level escalates to something we haven't shown this session
      const prevRank = LEVEL_RANK[prevLevelRef.current];
      const currentRank = LEVEL_RANK[currentLevel];

      if (currentRank > prevRank && !shownRef.current.has(currentLevel) && currentLevel !== "clear") {
        shownRef.current.add(currentLevel);
        setVisible(true);
        setDismissing(false);

        // Sound
        if (currentLevel === "tornado_emergency") {
          playWarningSiren("warning");
          setTimeout(() => playWarningSiren("warning"), 5500); // double siren for emergency
        } else if (currentLevel === "tornado_warning") {
          playWarningSiren("warning");
        } else if (currentLevel === "tornado_pds_watch") {
          playPDSSiren();
        } else if (currentLevel === "tornado_watch") {
          playWarningSiren("watch");
        } else if (currentLevel === "thunderstorm_warning") {
          playThunderSound();
          setTimeout(playThunderSound, 1800);
        } else if (currentLevel === "thunderstorm_watch") {
          playWarningSiren("watch");
        }

        // Auto-dismiss thunderstorm after animation completes; tornado/PDS/emergency stays until dismissed
        if (currentLevel === "thunderstorm_warning" || currentLevel === "thunderstorm_watch") {
          setTimeout(dismiss, 7000);
        }
      }

      // If alerts cleared, reset so they can trigger again
      if (currentLevel === "clear") {
        shownRef.current.clear();
      }

      prevLevelRef.current = currentLevel;
    } catch { /* silent */ }
  }, [dismiss]);

  // Dev simulation: listen for test events dispatched by /weather-test page
  useEffect(() => {
    function handleTestEvent(e: Event) {
      const testLevel = (e as CustomEvent<AlertLevel>).detail;
      if (!testLevel || testLevel === "clear") {
        setVisible(false);
        return;
      }
      shownRef.current.delete(testLevel); // allow re-triggering in test mode
      prevLevelRef.current = "clear";     // reset rank so escalation fires
      setLevel(testLevel);
      setVisible(true);
      setDismissing(false);

      if (testLevel === "tornado_emergency") {
        playWarningSiren("warning");
        setTimeout(() => playWarningSiren("warning"), 5500);
      } else if (testLevel === "tornado_warning") {
        playWarningSiren("warning");
      } else if (testLevel === "tornado_pds_watch") {
        playPDSSiren();
      } else if (testLevel === "tornado_watch") {
        playWarningSiren("watch");
      } else if (testLevel === "thunderstorm_warning") {
        playThunderSound();
        setTimeout(playThunderSound, 1800);
      } else if (testLevel === "thunderstorm_watch") {
        playWarningSiren("watch");
      }

      if (testLevel === "thunderstorm_warning" || testLevel === "thunderstorm_watch") {
        setTimeout(dismiss, 7000);
      }
    }
    window.addEventListener("weather-test-scenario", handleTestEvent);
    return () => window.removeEventListener("weather-test-scenario", handleTestEvent);
  }, [dismiss]);

  useEffect(() => {
    fetchAndCheck();
    intervalRef.current = setInterval(fetchAndCheck, 5 * 60 * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchAndCheck]);

  if (!visible) return null;

  const isTornado = level === "tornado_warning" || level === "tornado_watch" || level === "tornado_pds_watch" || level === "tornado_emergency";
  const isWarning = level === "tornado_warning" || level === "tornado_emergency" || level === "thunderstorm_warning";
  const isEmergencyLevel = level === "tornado_emergency";
  const isPDSLevel = level === "tornado_pds_watch";

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden ${
        dismissing ? "overlay-out" : "overlay-in"
      }`}
      role="alert"
      aria-live="assertive"
    >
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: isTornado
            ? "rgba(10,5,15,0.93)"
            : isWarning
            ? "rgba(5,5,30,0.88)"
            : "rgba(5,10,30,0.82)",
        }}
      />

      {/* Tornado: screen shake + sweeping funnel */}
      {isTornado && (
        <>
          <div className="screen-shake absolute inset-0 pointer-events-none" />

          {/* Emergency strobe background */}
          {isEmergencyLevel && <div className="emergency-strobe absolute inset-0 pointer-events-none" />}

          {isEmergencyLevel ? (
            /* ── Massive emergency tornado — full screen height ── */
            <>
              <div
                className="tornado-emergency-cross absolute pointer-events-none"
                style={{ top: "-10px", left: 0 }}
              >
                <div style={{ transform: "scale(2.8)", transformOrigin: "top center" }}>
                  <TornadoSVG />
                </div>
              </div>
              {/* Ground churn at the very bottom */}
              <div
                className="tornado-emergency-cross absolute pointer-events-none"
                style={{
                  bottom: "2%",
                  left: 0,
                  width: "600px",
                  height: "24px",
                  background: "radial-gradient(ellipse, rgba(120,60,0,0.85) 0%, transparent 70%)",
                  borderRadius: "50%",
                }}
              />
            </>
          ) : (
            /* ── Standard tornado — top of funnel near top of screen ── */
            <>
              <div
                className="tornado-cross absolute pointer-events-none"
                style={{ top: "6%", left: 0 }}
              >
                <TornadoSVG />
              </div>
              {/* Ground debris near bottom */}
              <div
                className="tornado-cross absolute pointer-events-none"
                style={{
                  bottom: "8%",
                  left: 0,
                  width: "320px",
                  height: "8px",
                  background: "radial-gradient(ellipse, rgba(100,80,20,0.7) 0%, transparent 70%)",
                  borderRadius: "50%",
                }}
              />
            </>
          )}
        </>
      )}

      {/* Thunderstorm: rain + lightning flash */}
      {!isTornado && (
        <>
          <RainLayer />
          <div className="lightning-flash absolute inset-0 bg-white pointer-events-none" />
        </>
      )}

      {/* Center card */}
      <div
        className="relative z-10 flex flex-col items-center gap-6 px-8 py-10 max-w-lg w-full mx-6 rounded-3xl border text-center"
        style={{
          background: isEmergencyLevel ? "rgba(40,0,0,0.97)" : isWarning ? "rgba(25,5,5,0.95)" : isPDSLevel ? "rgba(20,5,30,0.95)" : "rgba(25,25,5,0.95)",
          borderColor: isEmergencyLevel ? "rgba(239,68,68,0.9)" : isWarning ? "rgba(239,68,68,0.5)" : isPDSLevel ? "rgba(167,139,250,0.6)" : "rgba(250,204,21,0.4)",
          boxShadow: isEmergencyLevel
            ? "0 0 80px rgba(239,68,68,0.5), 0 0 160px rgba(239,68,68,0.2), 0 25px 50px rgba(0,0,0,0.9)"
            : isWarning
            ? "0 0 60px rgba(239,68,68,0.25), 0 25px 50px rgba(0,0,0,0.8)"
            : isPDSLevel
            ? "0 0 60px rgba(167,139,250,0.25), 0 25px 50px rgba(0,0,0,0.8)"
            : "0 0 60px rgba(250,204,21,0.2), 0 25px 50px rgba(0,0,0,0.8)",
        }}
      >
        {/* Icon */}
        {isTornado ? (
          <div className="w-20 h-20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-16 h-16 fill-current text-red-400" aria-hidden>
              <path d="M6 4h12v2H6zm2 4h8v2H8zm2 4h4v2h-4zm1 4h2v2h-2zm.5 4h1v2h-1z" />
            </svg>
          </div>
        ) : (
          <ThunderstormSVG />
        )}

        {/* Label */}
        <div
          className="text-xs font-black tracking-[0.3em] uppercase px-4 py-2 rounded-lg"
          style={{
            background: isEmergencyLevel ? "rgba(239,68,68,0.3)" : isWarning ? "rgba(239,68,68,0.2)" : isPDSLevel ? "rgba(167,139,250,0.2)" : "rgba(250,204,21,0.15)",
            color: isEmergencyLevel ? "#ff8080" : isWarning ? "#fca5a5" : isPDSLevel ? "#c4b5fd" : "#fde68a",
            border: isEmergencyLevel ? "1px solid rgba(239,68,68,0.7)" : isWarning ? "1px solid rgba(239,68,68,0.4)" : isPDSLevel ? "1px solid rgba(167,139,250,0.5)" : "1px solid rgba(250,204,21,0.3)",
          }}
        >
          {level === "tornado_emergency"  && "🔴 TORNADO EMERGENCY — LIFE-THREATENING SITUATION"}
          {level === "tornado_warning"    && "⚠ TORNADO WARNING — TAKE SHELTER NOW"}
          {level === "tornado_pds_watch"  && "⚠ PDS TORNADO WATCH — PARTICULARLY DANGEROUS SITUATION"}
          {level === "tornado_watch"      && "TORNADO WATCH IN EFFECT"}
          {level === "thunderstorm_warning" && "⚠ SEVERE THUNDERSTORM WARNING"}
          {level === "thunderstorm_watch"   && "SEVERE THUNDERSTORM WATCH"}
        </div>

        <p className="text-slate-300 text-base leading-relaxed">
          {level === "tornado_emergency"  && "A tornado emergency has been declared for the Millstadt area. An extremely dangerous and life-threatening tornado is occurring. TAKE SHELTER IN A STURDY STRUCTURE IMMEDIATELY."}
          {level === "tornado_warning"    && "A tornado warning has been issued for St. Clair County. Move to an interior room on the lowest floor immediately."}
          {level === "tornado_pds_watch"  && "A Particularly Dangerous Situation Tornado Watch is in effect. This is reserved for situations where strong, long-track tornadoes are likely. Take this extremely seriously."}
          {level === "tornado_watch"      && "Conditions are favorable for tornado development in St. Clair County. Stay weather-aware and be ready to take shelter."}
          {level === "thunderstorm_warning" && "A severe thunderstorm warning is in effect. Large hail and damaging winds are occurring or imminent."}
          {level === "thunderstorm_watch"   && "Conditions are favorable for severe thunderstorms. Monitor local weather and be ready to act."}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <a
            href="/weather"
            className="flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-wider text-white transition-colors"
            style={{ background: isWarning ? "#b91c1c" : "#854d0e" }}
            onClick={dismiss}
          >
            View Weather Page
          </a>
          <button
            onClick={dismiss}
            className="flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-wider border border-white/20 text-slate-300 hover:text-white hover:border-white/40 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
