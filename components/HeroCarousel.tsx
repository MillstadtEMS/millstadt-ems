"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const IMAGES = [
  "/images/millstadt-ems/IMG_7771.jpeg",
  "/images/millstadt-ems/hero/IMG_5333.jpeg",
  "/images/millstadt-ems/hero/IMG_7773.jpeg",
  "/images/millstadt-ems/hero/IMG_8392.jpeg",
  "/images/millstadt-ems/hero/IMG_8467.JPG",
  "/images/millstadt-ems/hero/IMG_8516.jpeg",
  "/images/millstadt-ems/hero/IMG_2072.JPG",
  "/images/millstadt-ems/hero/7A8662CA-9125-4252-8E4C-F029CE247079.jpeg",
  "/images/millstadt-ems/hero/811D6F5D-4DD7-4E6C-B758-7B4167F03B38.jpeg",
  "/images/millstadt-ems/hero/6A3DE69E-2C3E-4E0E-90FA-FF42A7320338.png",
];

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [next, setNext]       = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      const nextIdx = (current + 1) % IMAGES.length;
      setNext(nextIdx);
      setTransitioning(false);
      // Small tick lets the new image mount before we start fading it in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setTransitioning(true));
      });
      // After fade completes, promote next → current
      setTimeout(() => {
        setCurrent(nextIdx);
        setNext(null);
        setTransitioning(false);
      }, 2000);
    }, 10_000);
    return () => clearInterval(id);
  }, [current]);

  return (
    <>
      {/* Current image — always fully visible underneath */}
      <Image
        src={IMAGES[current]}
        alt="Millstadt EMS"
        fill
        className="object-cover object-center"
        style={{ zIndex: 0 }}
        priority={current === 0}
      />
      {/* Next image — fades in on top, no gap ever */}
      {next !== null && (
        <Image
          key={next}
          src={IMAGES[next]}
          alt=""
          fill
          className="object-cover object-center"
          style={{
            zIndex: 1,
            opacity: transitioning ? 1 : 0,
            transition: "opacity 2s ease-in-out",
          }}
          aria-hidden
        />
      )}
    </>
  );
}
