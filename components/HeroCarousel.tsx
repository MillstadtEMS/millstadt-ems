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

const IMAGE_STYLE: React.CSSProperties = {
  filter: "brightness(0.32)",
  objectFit: "cover",
  objectPosition: "center",
};

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [next, setNext]       = useState<number | null>(null);
  const [fadeIn, setFadeIn]   = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      const nextIdx = (current + 1) % IMAGES.length;
      setNext(nextIdx);
      setFadeIn(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setFadeIn(true)));
      setTimeout(() => {
        setCurrent(nextIdx);
        setNext(null);
        setFadeIn(false);
      }, 2500);
    }, 10_000);
    return () => clearInterval(id);
  }, [current]);

  return (
    <>
      {/* Current — always fully visible underneath */}
      <Image
        src={IMAGES[current]}
        alt="Millstadt EMS"
        fill
        style={{ ...IMAGE_STYLE, zIndex: 0 }}
        priority={current === 0}
      />
      {/* Next — crossfades in on top, already dark from frame 1 */}
      {next !== null && (
        <Image
          key={next}
          src={IMAGES[next]}
          alt=""
          fill
          aria-hidden
          style={{
            ...IMAGE_STYLE,
            zIndex: 1,
            opacity: fadeIn ? 1 : 0,
            transition: "opacity 2.5s ease-in-out",
          }}
        />
      )}
    </>
  );
}
