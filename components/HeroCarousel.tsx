"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toPublicMediaItems } from "@/lib/public-media";

interface HeroImage {
  src: string;
  brightness: number;
  position?: string;
}

// brightness: 0.32 for daytime, 0.55 for night shots already taken in the dark
const STATIC_IMAGES: HeroImage[] = [
  { src: "/images/millstadt-ems/IMG_7771.jpeg",                                  brightness: 0.45 },
  { src: "/images/millstadt-ems/hero/IMG_5333.jpeg",                             brightness: 0.65 },
  { src: "/images/millstadt-ems/hero/IMG_7773.jpeg",                             brightness: 0.45 },
  { src: "/images/millstadt-ems/hero/IMG_8392.jpeg",                             brightness: 0.65 },
  { src: "/images/millstadt-ems/hero/IMG_8467.JPG",                              brightness: 0.45 },
  { src: "/images/millstadt-ems/hero/IMG_8516.jpeg",                             brightness: 0.45 },
  { src: "/images/millstadt-ems/hero/IMG_2072.JPG",                              brightness: 0.45 },
  { src: "/images/millstadt-ems/hero/7A8662CA-9125-4252-8E4C-F029CE247079.jpeg", brightness: 0.45 },
  { src: "/images/millstadt-ems/hero/811D6F5D-4DD7-4E6C-B758-7B4167F03B38.jpeg", brightness: 0.85, position: "center 70%" },
  { src: "/images/millstadt-ems/hero/6A3DE69E-2C3E-4E0E-90FA-FF42A7320338.png",  brightness: 0.45 },
];

export default function HeroCarousel() {
  const [images, setImages] = useState(STATIC_IMAGES);
  const [slots, setSlots]   = useState<[number, number]>([0, 1]);
  const [showTop, setShowTop] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/public/media?collection=hero", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : [])
      .then((data: unknown) => {
        const managed = toPublicMediaItems(data);
        if (managed.length > 0) {
          setImages(managed.map((item) => ({ src: item.url, brightness: item.brightness })));
          setSlots([0, managed.length < 2 ? 0 : 1]);
          setShowTop(false);
        }
      })
      .catch(() => { /* fallback to static */ });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => {
      setReducedMotion(preference.matches);
      if (preference.matches) {
        setSlots([0, 0]);
        setShowTop(false);
      }
    };
    syncPreference();
    preference.addEventListener("change", syncPreference);
    return () => preference.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    const INTERVAL = 10_000;
    const FADE     = 2500;
    let step = 0;
    let intervalId: number | null = null;
    const timeouts = new Set<number>();

    function clearTimers() {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
      timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeouts.clear();
    }

    function scheduleTimeout(callback: () => void, delay: number) {
      const timeoutId = window.setTimeout(() => {
        timeouts.delete(timeoutId);
        callback();
      }, delay);
      timeouts.add(timeoutId);
    }

    const tick = () => {
      const nextStep = (step + 1) % images.length;
      setSlots([step, nextStep]);
      setShowTop(false);
      scheduleTimeout(() => setShowTop(true), 50);
      scheduleTimeout(() => {
        step = nextStep;
        setSlots([nextStep, nextStep]);
        setShowTop(false);
      }, FADE + 100);
    };

    function startRotation() {
      clearTimers();
      if (reducedMotion || images.length < 2 || document.visibilityState === "hidden") return;
      intervalId = window.setInterval(tick, INTERVAL);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        clearTimers();
        setShowTop(false);
      } else {
        startRotation();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    startRotation();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearTimers();
    };
  }, [images, reducedMotion]);

  const imgStyle = (brightness: number, position?: string): React.CSSProperties => ({
    filter: `brightness(${brightness})`,
    objectFit: "cover",
    objectPosition: position || "center",
    willChange: "opacity",
  });

  const bottom = images[reducedMotion ? 0 : slots[0]] ?? images[0] ?? STATIC_IMAGES[0];
  const top = images[slots[1]] ?? bottom;

  return (
    <>
      <Image src={bottom.src} alt="Millstadt EMS" fill style={{ ...imgStyle(bottom.brightness, bottom.position), zIndex: 0 }} priority={bottom.src === images[0]?.src} unoptimized={bottom.src.startsWith("https://")} />
      {!reducedMotion && images.length > 1 ? (
        <Image key={slots[1]} src={top.src} alt="" fill aria-hidden unoptimized={top.src.startsWith("https://")} style={{ ...imgStyle(top.brightness, top.position), zIndex: 1, opacity: showTop ? 1 : 0, transition: showTop ? "opacity 2.5s ease-in-out" : "none" }} />
      ) : null}
    </>
  );
}
