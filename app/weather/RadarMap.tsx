"use client";

import { useEffect, useRef, useState } from "react";

interface RadarFrame { time: number; path: string; }

const LEGEND = [
  { color: "#04e9e7", label: "15" },
  { color: "#019ff4", label: "20" },
  { color: "#0300f4", label: "25" },
  { color: "#02fd02", label: "30" },
  { color: "#01c501", label: "35" },
  { color: "#008e00", label: "40" },
  { color: "#fdf802", label: "45" },
  { color: "#e5bc00", label: "50" },
  { color: "#fd9500", label: "55" },
  { color: "#fd0000", label: "60" },
  { color: "#d40000", label: "65" },
  { color: "#bc0000", label: "70" },
  { color: "#f800fd", label: "75+" },
];

function formatTime(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

export default function RadarMap() {
  const [frames, setFrames] = useState<RadarFrame[]>([]);
  const [rvHost, setRvHost] = useState("https://tilecache.rainviewer.com");
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [framesReady, setFramesReady] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layersRef = useRef<any[]>([]);
  const playTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Init map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let alive = true;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (!alive || !containerRef.current || mapRef.current) return;

      lRef.current = L;
      const map = L.map(containerRef.current, {
        center: [38.4578, -89.9776],
        zoom: 7,
        zoomControl: true,
        attributionControl: true,
      });
      mapRef.current = map;

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { attribution: "© OpenStreetMap © CARTO", subdomains: "abcd", maxZoom: 19 }
      ).addTo(map);

      // State/county boundaries
      L.tileLayer(
        "https://mesonet.agron.iastate.edu/c/tile.py/1.0.0/usstates/{z}/{x}/{y}.png",
        { opacity: 0.35, zIndex: 3 }
      ).addTo(map);

      // Millstadt marker
      const icon = L.divIcon({
        html: `<div style="width:12px;height:12px;background:#f0b429;border:2px solid #040d1a;border-radius:50%;box-shadow:0 0 0 3px rgba(240,180,41,0.35)"></div>`,
        className: "",
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      L.marker([38.4578, -89.9776], { icon })
        .addTo(map)
        .bindPopup('<b style="font-family:sans-serif;font-size:13px">Millstadt, IL</b>');

      setMapReady(true);
    })();

    return () => {
      alive = false;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // ── Fetch RainViewer frames ────────────────────────────────────────────────
  useEffect(() => {
    fetch("https://api.rainviewer.com/public/weather-maps.json")
      .then(r => r.json())
      .then(data => {
        setRvHost(data.host ?? "https://tilecache.rainviewer.com");
        const past: RadarFrame[] = data.radar?.past ?? [];
        setFrames(past);
        setFrameIdx(past.length - 1);
        setFramesReady(true);
      })
      .catch(() => setFramesReady(true));
  }, []);

  // ── Pre-load ALL frames as tile layers (no remove/add during animation) ────
  // Color scheme 5 = NEXRAD Level-III — matches NWS standard reflectivity colors
  useEffect(() => {
    const L = lRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !map || frames.length === 0) return;

    // Clear any existing radar layers
    layersRef.current.forEach(l => { try { map.removeLayer(l); } catch { /* noop */ } });
    layersRef.current = [];

    // Create one tile layer per frame — all loaded upfront, most hidden
    frames.forEach((frame, i) => {
      const layer = L.tileLayer(
        `${rvHost}${frame.path}/256/{z}/{x}/{y}/5/1_1.png`,
        {
          opacity: i === frames.length - 1 ? 0.8 : 0,
          zIndex: 2,
          tileSize: 256,
        }
      );
      layer.addTo(map);
      layersRef.current.push(layer);
    });
  }, [mapReady, frames, rvHost]);

  // ── Frame switch — just toggle opacity (tiles already loaded, no skip) ─────
  useEffect(() => {
    layersRef.current.forEach((layer, i) => {
      layer.setOpacity(i === frameIdx ? 0.8 : 0);
    });
  }, [frameIdx]);

  // ── Play / pause ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (playing && frames.length > 0) {
      playTimer.current = setInterval(() => {
        setFrameIdx(i => (i + 1) % frames.length);
      }, 400);
    } else {
      if (playTimer.current) { clearInterval(playTimer.current); playTimer.current = null; }
    }
    return () => { if (playTimer.current) { clearInterval(playTimer.current); playTimer.current = null; } };
  }, [playing, frames.length]);

  const isLive = frameIdx === frames.length - 1;

  return (
    <div className="rounded-2xl overflow-hidden border border-white/8 shadow-2xl shadow-black/40 bg-[#040d1a]">

      {/* ── Map ── */}
      <div ref={containerRef} style={{ height: "520px", width: "100%" }} />

      {/* ── Time scrubber ── */}
      <div className="bg-[#020912] border-t border-white/8 px-5 py-4">
        {framesReady && frames.length > 0 ? (
          <>
            <div className="flex items-center gap-3 mb-3">
              {/* Oldest */}
              <button
                onClick={() => { setPlaying(false); setFrameIdx(0); }}
                className="text-slate-500 hover:text-white transition-colors shrink-0"
                title="Oldest frame"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
              </button>

              {/* Step back */}
              <button
                onClick={() => { setPlaying(false); setFrameIdx(i => Math.max(0, i - 1)); }}
                className="text-slate-500 hover:text-white transition-colors shrink-0"
                title="Previous frame"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M6 6h2v12H6zm12 0-8.5 6 8.5 6V6z"/></svg>
              </button>

              {/* Play / Pause */}
              <button
                onClick={() => setPlaying(v => !v)}
                className="w-9 h-9 rounded-full bg-[#f0b429] hover:bg-[#d9a320] flex items-center justify-center text-[#040d1a] transition-colors shrink-0"
                title={playing ? "Pause" : "Play loop"}
              >
                {playing ? (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" style={{ marginLeft: "2px" }}><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>

              {/* Step forward */}
              <button
                onClick={() => { setPlaying(false); setFrameIdx(i => Math.min(frames.length - 1, i + 1)); }}
                className="text-slate-500 hover:text-white transition-colors shrink-0"
                title="Next frame"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M6 18l8.5-6L6 6v12zm2.5-6 5.5 3.9V8.1L8.5 12z M16 6h2v12h-2z"/></svg>
              </button>

              {/* LIVE button */}
              <button
                onClick={() => { setPlaying(false); setFrameIdx(frames.length - 1); }}
                className={`px-3 py-1 rounded-lg text-[11px] font-black tracking-widest uppercase transition-colors shrink-0 ${
                  isLive
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : "bg-white/5 text-slate-500 border border-white/10 hover:text-slate-300"
                }`}
                title="Jump to latest"
              >
                {isLive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />}
                LIVE
              </button>

              {/* Current frame time */}
              <span className="text-slate-400 text-sm font-bold ml-auto shrink-0">
                {formatTime(frames[frameIdx]?.time ?? 0)}
              </span>
            </div>

            {/* Scrubber */}
            <input
              type="range"
              min={0}
              max={frames.length - 1}
              value={frameIdx}
              onChange={e => { setPlaying(false); setFrameIdx(Number(e.target.value)); }}
              className="w-full h-1.5 appearance-none rounded-full cursor-pointer"
              style={{
                background: `linear-gradient(to right, #f0b429 ${(frameIdx / (frames.length - 1)) * 100}%, #1e293b ${(frameIdx / (frames.length - 1)) * 100}%)`,
              }}
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-slate-600 text-[10px]">{formatTime(frames[0]?.time ?? 0)}</span>
              <span className="text-slate-600 text-[10px]">{frames.length} frames · ~{Math.round(frames.length * 10 / 60)}hr history</span>
              <span className="text-slate-600 text-[10px]">{formatTime(frames[frames.length - 1]?.time ?? 0)}</span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 py-1">
            <div className="w-4 h-4 rounded-full border border-slate-600 border-t-[#f0b429] animate-spin" />
            <span className="text-slate-600 text-sm">Loading radar frames…</span>
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div className="bg-[#020912] border-t border-white/8 px-5 py-4">
        <div className="flex items-center gap-1 flex-wrap mb-2">
          {LEGEND.map((entry, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ background: entry.color }} />
              <span className="text-[10px] text-slate-500 whitespace-nowrap">{entry.label}</span>
            </div>
          ))}
          <span className="text-slate-600 text-[10px] ml-1">dBZ</span>
        </div>
        <p className="text-slate-500 text-xs leading-relaxed">
          <span className="text-slate-400 font-bold">Base Reflectivity:</span>{" "}
          Precipitation intensity. Values above 55 dBZ typically indicate large hail.
        </p>
        <p className="text-slate-700 text-[10px] mt-2">
          RainViewer · NEXRAD Level-III color scale · ~{Math.round(frames.length * 10 / 60)}hr loop available
        </p>
      </div>

    </div>
  );
}
