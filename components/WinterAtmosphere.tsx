"use client";

import { useEffect, useRef } from "react";
import { useWinterTheme } from "@/lib/seasonal/useWinterTheme";
import { isTesla } from "@/lib/device/profile";
import TurkeyFlyby from "./TurkeyFlyby";
import "./winter-atmosphere.css";
import "./winter-public-logos.css";

// Pre-render the soft light at three focal distances; only the small textures
// are composited each frame, regardless of the number of visible flakes.
function snowTexture(layer: number) {
  const texture = document.createElement("canvas");
  texture.width = texture.height = 32;
  const context = texture.getContext("2d");
  if (!context) return texture;
  const glow = context.createRadialGradient(15, 14, 0, 16, 16, 15);
  glow.addColorStop(0, "rgba(255,255,250,1)");
  glow.addColorStop(layer === 2 ? 0.12 : 0.28, "rgba(244,252,255,.9)");
  glow.addColorStop(layer === 2 ? 0.52 : 0.72, "rgba(192,222,246,.46)");
  glow.addColorStop(1, "rgba(186,214,242,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, 32, 32);
  if (layer > 0) {
    context.translate(16, 16);
    context.lineCap = "round";
    for (const [color, thickness] of [["#63879c", 2.8], ["#f9fdff", 1.7]] as const) {
      context.strokeStyle = color;
      context.lineWidth = thickness;
      context.beginPath();
      for (let arm = 0; arm < 6; arm++) {
        context.moveTo(0, 0); context.lineTo(0, -12);
        context.moveTo(-3, -9); context.lineTo(0, -6); context.lineTo(3, -9);
        context.rotate(Math.PI / 3);
      }
      context.stroke();
    }
  }
  return texture;
}

// Level 0 is the everyday winter snowfall. When Millstadt reports light, moderate or heavy snow,
// the site's snow thickens to match (more, faster, slightly larger flakes with more drift).
const intensities = [
  { count: 1, speed: 1, size: 1, wind: 1 },
  { count: 1.4, speed: 1.08, size: 1, wind: 1.1 },
  { count: 2, speed: 1.18, size: 1.08, wind: 1.22 },
  { count: 2.8, speed: 1.3, size: 1.15, wind: 1.45 },
] as const;

function Snowfall() {
  const ref = useRef<HTMLCanvasElement>(null);
  const level = useRef(0);
  const rebuild = useRef<() => void>(() => {});

  useEffect(() => {
    let active = true;
    // Visual Editor style preview: ?preview=ve&snow-preview=0..3 shows a snow level (cosmetic only).
    const params = new URLSearchParams(window.location.search);
    const preview = params.get("preview") === "ve" ? params.get("snow-preview") : null;
    if (preview !== null && /^[0-3]$/.test(preview)) {
      level.current = Number(preview);
      rebuild.current();
      return () => { active = false; };
    }
    async function check() {
      try {
        const res = await fetch("/api/winter/snowfall");
        if (!res.ok) return;
        const data: unknown = await res.json();
        const reported = typeof data === "object" && data !== null && "level" in data && typeof data.level === "number" ? data.level : 0;
        const next = Math.max(0, Math.min(3, Math.round(reported)));
        if (active && next !== level.current) {
          level.current = next;
          rebuild.current();
        }
      } catch { /* Keep the current snowfall when weather is unavailable. */ }
    }
    void check();
    const timer = window.setInterval(check, 15 * 60 * 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const textures = [0, 1, 2].map(snowTexture);
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastFrame = 0;
    let elapsed = 0;
    let boost: (typeof intensities)[number] = intensities[0];
    // Flakes keep the same look on every screen: size follows the width, fall speed the height.
    let sizeScale = 1;
    let speedScale = 1;
    const tesla = isTesla();
    let flakes: ReturnType<typeof makeFlake>[] = [];

    function makeFlake(index: number) {
      // Far dust is frequent. Only a few large flakes pass close to the lens.
      const layer = index % 13 === 0 ? 2 : index % 3 === 0 ? 1 : 0;
      return {
        layer,
        x: Math.random() * (width + 36) - 18,
        y: Math.random() * (height + 36) - 18,
        phase: Math.random() * Math.PI * 2,
        size: [3.2, 7.2, 13][layer] * (0.75 + Math.random() * 0.8) * boost.size * sizeScale,
        speed: [19, 38, 62][layer] * (0.75 + Math.random() * 0.55) * boost.speed * speedScale,
        alpha: [0.7, 0.92, 0.78][layer] * (0.72 + Math.random() * 0.28),
      };
    }

    function draw(step: number) {
      if (!context) return;
      context.clearRect(0, 0, width, height);
      elapsed += step;
      for (const flake of flakes) {
        flake.x += step * (0.27 + 0.38 * Math.sin(elapsed * 0.47 + flake.phase)) * flake.speed * boost.wind;
        flake.y += step * flake.speed;
        if (flake.y > height + 10) flake.y = -10;
        if (flake.x > width + 10) flake.x = -10;
        if (flake.x < -10) flake.x = width + 10;
        const edge = Math.abs(flake.x / width - 0.5) * 2;
        context.globalAlpha = flake.alpha * (0.65 + edge * 0.35);
        context.drawImage(textures[flake.layer], flake.x, flake.y, flake.size, flake.size);
      }
      context.globalAlpha = 1;
    }

    function resize() {
      if (!canvas || !context) return;
      width = Math.max(1, canvas.clientWidth);
      height = Math.max(1, canvas.clientHeight);
      // Car screens draw at 1x with fewer flakes so the snowball games stay responsive.
      const scale = Math.min(window.devicePixelRatio || 1, tesla ? 1 : 1.5);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
      boost = intensities[level.current] ?? intensities[0];
      sizeScale = Math.min(1.6, Math.max(0.85, width / 1440));
      speedScale = Math.min(1.6, Math.max(0.8, height / 900));
      const light = connection?.saveData || tesla;
      const base = Math.min(light ? (tesla ? 120 : 65) : 210, Math.max(55, Math.round(width * height / 4600)));
      const count = Math.min(light ? (tesla ? 220 : 110) : 520, Math.round(base * boost.count));
      flakes = Array.from({ length: count }, (_, index) => makeFlake(index));
      draw(0);
    }
    rebuild.current = resize;

    function animate(now: number) {
      if (now - lastFrame >= 1000 / (tesla ? 20 : 25)) {
        draw(Math.min((now - lastFrame) / 1000, 0.1));
        lastFrame = now;
      }
      frame = requestAnimationFrame(animate);
    }

    function syncMotion() {
      cancelAnimationFrame(frame);
      if (motion.matches || document.hidden) return;
      lastFrame = performance.now();
      frame = requestAnimationFrame(animate);
    }

    resize();
    syncMotion();
    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(canvas);
    motion.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncMotion);
    return () => {
      rebuild.current = () => {};
      cancelAnimationFrame(frame);
      sizeObserver.disconnect();
      motion.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncMotion);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="winter-snowfall" />;
}

export default function WinterAtmosphere() {
  const winter = useWinterTheme();
  return (
    <>
      {winter && <Snowfall />}
      {/* Thanksgiving week has its own Chicago date window (and skips staff routes), so it isn't tied to the snow. */}
      <TurkeyFlyby />
    </>
  );
}
