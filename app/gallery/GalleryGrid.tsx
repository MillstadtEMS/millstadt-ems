"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const photos = [
  "/images/millstadt-ems/gallery1.jpg",
  "/images/millstadt-ems/gallery5.jpg",
  "/images/millstadt-ems/gallery6.jpg",
  "/images/millstadt-ems/IMG_7770.jpeg",
  "/images/millstadt-ems/IMG_7771.jpeg",
  "/images/millstadt-ems/IMG_7772.jpeg",
  "/images/millstadt-ems/IMG_7773.jpeg",
  "/images/millstadt-ems/IMG_7774.jpeg",
  "/images/millstadt-ems/IMG_7775.jpeg",
  "/images/millstadt-ems/IMG_7777.jpeg",
  "/images/millstadt-ems/IMG_7779.jpeg",
  "/images/millstadt-ems/IMG_7780.jpeg",
  "/images/millstadt-ems/IMG_7782.jpeg",
  "/images/millstadt-ems/IMG_7784.jpeg",
  "/images/millstadt-ems/IMG_7788.jpeg",
  "/images/millstadt-ems/IMG_7789.jpeg",
  "/images/millstadt-ems/IMG_7790.jpeg",
  "/images/millstadt-ems/IMG_7791.jpeg",
  "/images/millstadt-ems/IMG_7792.jpeg",
  "/images/millstadt-ems/IMG_7834.jpeg",
  "/images/millstadt-ems/IMG_7878.jpeg",
  "/images/millstadt-ems/IMG_7106.jpeg",
  "/images/millstadt-ems/IMG_7112.jpeg",
  "/images/millstadt-ems/IMG_0256.jpeg",
  "/images/millstadt-ems/IMG_0260.jpeg",
  "/images/millstadt-ems/IMG_0263.jpeg",
  "/images/millstadt-ems/IMG_0556.jpeg",
  "/images/millstadt-ems/IMG_0855.jpeg",
  "/images/millstadt-ems/IMG_0886.jpeg",
  "/images/millstadt-ems/IMG_2081.jpeg",
  "/images/millstadt-ems/IMG_2114.jpeg",
  "/images/millstadt-ems/IMG_2115.jpeg",
  "/images/millstadt-ems/IMG_2123.JPG",
  "/images/millstadt-ems/IMG_2204.JPG",
  "/images/millstadt-ems/IMG_2301.jpeg",
  "/images/millstadt-ems/IMG_2408.jpeg",
  "/images/millstadt-ems/IMG_2617.jpeg",
  "/images/millstadt-ems/IMG_3130.jpeg",
  "/images/millstadt-ems/IMG_3131.jpeg",
  "/images/millstadt-ems/IMG_3134.jpeg",
  "/images/millstadt-ems/IMG_3142.jpeg",
  "/images/millstadt-ems/IMG_3143.jpeg",
  "/images/millstadt-ems/IMG_3144.jpeg",
  "/images/millstadt-ems/IMG_3145.jpeg",
  "/images/millstadt-ems/IMG_3146.jpeg",
  "/images/millstadt-ems/IMG_3147.jpeg",
  "/images/millstadt-ems/IMG_3148.jpeg",
  "/images/millstadt-ems/IMG_3149.jpeg",
  "/images/millstadt-ems/IMG_3150.jpeg",
  "/images/millstadt-ems/IMG_3151.jpeg",
  "/images/millstadt-ems/IMG_3152.jpeg",
  "/images/millstadt-ems/IMG_3153.jpeg",
  "/images/millstadt-ems/IMG_3154.jpeg",
  "/images/millstadt-ems/IMG_3155.jpeg",
  "/images/millstadt-ems/IMG_3156.jpeg",
  "/images/millstadt-ems/IMG_3158.jpeg",
  "/images/millstadt-ems/IMG_4428.jpeg",
  "/images/millstadt-ems/IMG_4429.jpeg",
  "/images/millstadt-ems/IMG_4433.jpeg",
  "/images/millstadt-ems/IMG_5208.jpeg",
  "/images/millstadt-ems/IMG_5324.jpeg",
  "/images/millstadt-ems/IMG_5326.jpeg",
  "/images/millstadt-ems/IMG_5328.jpeg",
  "/images/millstadt-ems/IMG_5336.jpeg",
  "/images/millstadt-ems/IMG_6015.JPG",
  "/images/millstadt-ems/IMG_6032.jpeg",
  "/images/millstadt-ems/IMG_6049.jpeg",
  "/images/millstadt-ems/IMG_6050.jpeg",
  "/images/millstadt-ems/IMG_6442.jpeg",
  "/images/millstadt-ems/IMG_8333.jpeg",
  "/images/millstadt-ems/IMG_8392.jpeg",
  "/images/millstadt-ems/IMG_8467.JPG",
  "/images/millstadt-ems/IMG_8468.JPG",
  "/images/millstadt-ems/IMG_8469.JPG",
  "/images/millstadt-ems/IMG_8509.jpeg",
  "/images/millstadt-ems/IMG_8512.jpeg",
  "/images/millstadt-ems/IMG_8516.jpeg",
  "/images/millstadt-ems/IMG_8640.jpeg",
  "/images/millstadt-ems/IMG_9307.jpeg",
  "/images/millstadt-ems/IMG_9608.JPG",
  "/images/millstadt-ems/IMG_9625.jpeg",
  "/images/millstadt-ems/5F02FCB4-40DA-4EDC-B7AC-9371634EAD86.jpeg",
  "/images/millstadt-ems/811D6F5D-4DD7-4E6C-B758-7B4167F03B38.jpeg",
  "/images/millstadt-ems/FBBC5D72-E8F1-4C31-9106-B79207E412AE.jpeg",
  "/images/millstadt-ems/community24.jpg",
  "/images/millstadt-ems/community33.jpg",
  "/images/millstadt-ems/fair.jpg",
  "/images/millstadt-ems/heli.jpg",
  "/images/millstadt-ems/lifeline.jpg",
  "/images/millstadt-ems/award.jpg",
  "/images/millstadt-ems/oldies1.jpg",
  "/images/millstadt-ems/oldies2.jpg",
  "/images/millstadt-ems/oldies3.jpg",
  "/images/millstadt-ems/oldies4.jpg",
  "/images/millstadt-ems/pr.jpg",
  "/images/millstadt-ems/truck1.jpg",
  "/images/millstadt-ems/IMG_0086.jpg",
  "/images/millstadt-ems/IMG_0353.jpeg",
  "/images/millstadt-ems/IMG_0859.jpg",
  "/images/millstadt-ems/IMG_1544.jpeg",
  "/images/millstadt-ems/IMG_1551.jpeg",
  "/images/millstadt-ems/IMG_1561.jpg",
  "/images/millstadt-ems/IMG_1604.jpeg",
  "/images/millstadt-ems/IMG_1619.jpeg",
  "/images/millstadt-ems/IMG_3128.jpg",
  "/images/millstadt-ems/IMG_3415.jpeg",
  "/images/millstadt-ems/IMG_5785.JPG",
  "/images/millstadt-ems/IMG_5789.JPG",
  "/images/millstadt-ems/IMG_5790.JPG",
  "/images/millstadt-ems/IMG_5791.JPG",
  "/images/millstadt-ems/IMG_5793.JPG",
  "/images/millstadt-ems/IMG_5794.JPG",
  "/images/millstadt-ems/IMG_5795.jpeg",
  "/images/millstadt-ems/IMG_5796.jpeg",
  "/images/millstadt-ems/IMG_5797.jpeg",
  "/images/millstadt-ems/IMG_5798.jpeg",
  "/images/millstadt-ems/IMG_5800.jpeg",
  "/images/millstadt-ems/IMG_5803.jpeg",
  "/images/millstadt-ems/IMG_5807.JPG",
  "/images/millstadt-ems/IMG_5808.jpeg",
  "/images/millstadt-ems/IMG_5809.PNG",
  "/images/millstadt-ems/IMG_5810.jpeg",
  "/images/millstadt-ems/IMG_5811.jpeg",
  "/images/millstadt-ems/IMG_5812.jpg",
  "/images/millstadt-ems/IMG_5813.JPG",
  "/images/millstadt-ems/IMG_5814.JPG",
  "/images/millstadt-ems/IMG_5815.jpeg",
  "/images/millstadt-ems/IMG_5816.JPG",
  "/images/millstadt-ems/IMG_5817.jpeg",
  "/images/millstadt-ems/IMG_8677.jpeg",
  "/images/millstadt-ems/IMG_8711.jpeg",
  "/images/millstadt-ems/IMG_9283.jpeg",
  "/images/millstadt-ems/IMG_0955.jpeg",
  "/images/millstadt-ems/IMG_1802.jpeg",
  "/images/millstadt-ems/IMG_3136.jpg",
  "/images/millstadt-ems/IMG_3140.jpg",
  "/images/millstadt-ems/IMG_3144b.jpg",
  "/images/millstadt-ems/IMG_4111.jpeg",
  "/images/millstadt-ems/IMG_4113.jpeg",
  "/images/millstadt-ems/IMG_4115.jpeg",
  "/images/millstadt-ems/IMG_4117.jpeg",
  "/images/millstadt-ems/IMG_5333.jpeg",
];

function getStart(i: number): { x: number; y: number; rot: number } {
  const n = i + 1;
  const side = i % 4;
  const along = ((n * 73) % 100) - 50;
  const rot = ((n * 47) % 40) - 20;
  const dist = 130 + ((n * 31) % 70);
  const x = side === 0 ? -dist : side === 1 ? dist : along * 0.4;
  const y = side === 2 ? -dist : side === 3 ? dist : along * 0.4;
  return { x, y, rot };
}

export default function GalleryGrid() {
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setActive(null); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [active]);

  return (
    <>
      <div className="columns-2 md:columns-3 lg:columns-4 gap-3 lg:gap-4">
        {photos.map((src, i) => {
          const { x, y, rot } = getStart(i);
          const delay = Math.min(i * 22, 900);
          return (
            <div
              key={src}
              className="break-inside-avoid mb-3 lg:mb-4 cursor-zoom-in"
              onClick={() => setActive(src)}
              style={{
                transform: visible ? "none" : `translate(${x}vw, ${y}vh) rotate(${rot}deg) scale(0.55)`,
                opacity: visible ? 1 : 0,
                transition: "transform 0.65s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.5s ease",
                transitionDelay: `${delay}ms`,
                willChange: "transform",
              }}
            >
              <div className="relative overflow-hidden rounded-xl bg-[#071428] group">
                <Image
                  src={src}
                  alt="Millstadt EMS"
                  width={600}
                  height={450}
                  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg">
                    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {active && (
        <div
          className="fixed inset-0 z-[200] bg-black/92 flex items-center justify-center p-4"
          onClick={() => setActive(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setActive(null)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors z-10"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>

          {/* Image */}
          <div
            className="relative max-w-5xl w-full max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={active}
              alt="Millstadt EMS"
              width={1400}
              height={1000}
              className="w-full h-auto max-h-[90vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}
