"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// brightness: 0.32 for daytime, 0.55 for night shots already taken in the dark
const STATIC_IMAGES: { src: string; brightness: number; position?: string }[] = [
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

  // Try to load custom hero images from the admin image manager
  useEffect(() => {
    fetch("/api/admin/media?collection=hero")
      .then(r => r.ok ? r.json() : [])
      .then((data: { url: string; brightness: number }[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setImages(data.map(d => ({ src: d.url, brightness: d.brightness ?? 0.45, position: d.position })));
        }
      })
      .catch(() => { /* fallback to static */ });
  }, []);

  useEffect(() => {
    const INTERVAL = 10_000;
    const FADE     = 2500;
    let step = 0;

    const tick = () => {
      const nextStep = (step + 1) % images.length;
      setSlots([step, nextStep]);
      setShowTop(false);
      const t1 = setTimeout(() => setShowTop(true), 50);
      const t2 = setTimeout(() => { step = nextStep; setSlots([nextStep, nextStep]); setShowTop(false); }, FADE + 100);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    };

    const id = setInterval(tick, INTERVAL);
    return () => clearInterval(id);
  }, [images]);

  const imgStyle = (brightness: number, position?: string): React.CSSProperties => ({
    filter: `brightness(${brightness})`,
    objectFit: "cover",
    objectPosition: position || "center",
    willChange: "opacity",
  });

  return (
    <>
      <Image src={images[slots[0]].src} alt="Millstadt EMS" fill style={{ ...imgStyle(images[slots[0]].brightness, images[slots[0]].position), zIndex: 0 }} priority={slots[0] === 0} unoptimized={images[slots[0]].src.startsWith("https://")} />
      <Image key={slots[1]} src={images[slots[1]].src} alt="" fill aria-hidden unoptimized={images[slots[1]].src.startsWith("https://")} style={{ ...imgStyle(images[slots[1]].brightness, images[slots[1]].position), zIndex: 1, opacity: showTop ? 1 : 0, transition: showTop ? "opacity 2.5s ease-in-out" : "none" }} />
    </>
  );
}
