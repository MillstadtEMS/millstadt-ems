"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useWinterTheme } from "@/lib/seasonal/useWinterTheme";
import "./winter-atmosphere.css";

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
  return texture;
}

function Snowfall() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;
    const textures = [0, 1, 2].map(snowTexture);
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastFrame = 0;
    let elapsed = 0;
    let flakes: ReturnType<typeof makeFlake>[] = [];

    function makeFlake(index: number) {
      // Far dust is frequent. Only a few large flakes pass close to the lens.
      const layer = index % 13 === 0 ? 2 : index % 3 === 0 ? 1 : 0;
      return {
        layer,
        x: Math.random() * (width + 36) - 18,
        y: Math.random() * (height + 36) - 18,
        phase: Math.random() * Math.PI * 2,
        size: [1.8, 4.4, 9.5][layer] * (0.7 + Math.random() * 0.9),
        speed: [12, 27, 51][layer] * (0.75 + Math.random() * 0.55),
        alpha: [0.58, 0.79, 0.36][layer] * (0.65 + Math.random() * 0.35),
      };
    }

    function draw(step: number) {
      if (!context) return;
      context.clearRect(0, 0, width, height);
      elapsed += step;
      for (const flake of flakes) {
        flake.x += step * (0.27 + 0.38 * Math.sin(elapsed * 0.47 + flake.phase)) * flake.speed;
        flake.y += step * flake.speed;
        if (flake.y > height + 10) flake.y = -10;
        if (flake.x > width + 10) flake.x = -10;
        if (flake.x < -10) flake.x = width + 10;
        const edge = Math.abs(flake.x / width - 0.5) * 2;
        context.globalAlpha = flake.alpha * (0.4 + edge * 0.75);
        context.drawImage(textures[flake.layer], flake.x, flake.y, flake.size, flake.size);
      }
      context.globalAlpha = 1;
    }

    function resize() {
      if (!canvas || !context) return;
      width = Math.max(1, canvas.clientWidth);
      height = Math.max(1, canvas.clientHeight);
      const scale = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
      const count = Math.min(170, Math.max(48, Math.round(width * height / 5700)));
      flakes = Array.from({ length: count }, (_, index) => makeFlake(index));
      draw(0);
    }

    function animate(now: number) {
      if (now - lastFrame >= 1000 / 25) {
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
  const pathname = usePathname();
  return winter && pathname === "/" ? <Snowfall /> : null;
}
