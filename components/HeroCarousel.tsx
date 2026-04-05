"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// brightness: 0.32 for daytime, 0.55 for night shots already taken in the dark
const IMAGES: { src: string; brightness: number }[] = [
  { src: "/images/millstadt-ems/IMG_7771.jpeg",                                  brightness: 0.32 },
  { src: "/images/millstadt-ems/hero/IMG_5333.jpeg",                             brightness: 0.55 }, // HSHS hospital night
  { src: "/images/millstadt-ems/hero/IMG_7773.jpeg",                             brightness: 0.32 },
  { src: "/images/millstadt-ems/hero/IMG_8392.jpeg",                             brightness: 0.55 }, // fireworks night
  { src: "/images/millstadt-ems/hero/IMG_8467.JPG",                              brightness: 0.32 },
  { src: "/images/millstadt-ems/hero/IMG_8516.jpeg",                             brightness: 0.32 },
  { src: "/images/millstadt-ems/hero/IMG_2072.JPG",                              brightness: 0.32 },
  { src: "/images/millstadt-ems/hero/7A8662CA-9125-4252-8E4C-F029CE247079.jpeg", brightness: 0.32 },
  { src: "/images/millstadt-ems/hero/811D6F5D-4DD7-4E6C-B758-7B4167F03B38.jpeg", brightness: 0.6  }, // northern lights night
  { src: "/images/millstadt-ems/hero/6A3DE69E-2C3E-4E0E-90FA-FF42A7320338.png",  brightness: 0.32 },
];

export default function HeroCarousel() {
  const [slots, setSlots] = useState<[number, number]>([0, 1]); // [bottom, top]
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const INTERVAL = 10_000;
    const FADE     = 2500;

    let step = 0; // which image is currently fully shown

    const tick = () => {
      const nextStep = (step + 1) % IMAGES.length;
      // Load next image into top slot, keep current in bottom
      setSlots([step, nextStep]);
      setShowTop(false);

      // Small delay so browser paints the new top image before fading
      const t1 = setTimeout(() => setShowTop(true), 50);
      // After fade completes, collapse top into bottom, hide top
      const t2 = setTimeout(() => {
        step = nextStep;
        setSlots([nextStep, nextStep]);
        setShowTop(false);
      }, FADE + 100);

      return () => { clearTimeout(t1); clearTimeout(t2); };
    };

    const id = setInterval(tick, INTERVAL);
    return () => clearInterval(id);
  }, []);

  const imgStyle = (brightness: number): React.CSSProperties => ({
    filter: `brightness(${brightness})`,
    objectFit: "cover",
    objectPosition: "center",
    willChange: "opacity",
  });

  return (
    <>
      {/* Bottom layer — always fully opaque, no flash */}
      <Image
        src={IMAGES[slots[0]].src}
        alt="Millstadt EMS"
        fill
        style={{ ...imgStyle(IMAGES[slots[0]].brightness), zIndex: 0 }}
        priority={slots[0] === 0}
      />
      {/* Top layer — fades in over the bottom */}
      <Image
        key={slots[1]}
        src={IMAGES[slots[1]].src}
        alt=""
        fill
        aria-hidden
        style={{
          ...imgStyle(IMAGES[slots[1]].brightness),
          zIndex: 1,
          opacity: showTop ? 1 : 0,
          transition: showTop ? "opacity 2.5s ease-in-out" : "none",
        }}
      />
    </>
  );
}
