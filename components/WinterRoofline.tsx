"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import styles from "./WinterRoofline.module.css";

const bulbs = ["#ff463e", "#ffca48", "#48ef94", "#69caff", "#ff6956", "#ffdf8f", "#57dfab", "#ee80c7"];
const sockets = [0.07, 0.26, 0.47, 0.69, 0.89];
const swags = [15, 11, 17, 13, 16, 21];

export default function WinterRoofline({ showCharacter }: { showCharacter: boolean }) {
  const roof = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const garland = roof.current;
    const header = garland?.closest("header");
    if (!garland || !header) return;

    let warm: HTMLElement | undefined;
    function illuminate(x: number) {
      const next = Array.from(garland!.children).find((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && x >= box.left && x <= box.right;
      }) as HTMLElement | undefined;
      if (warm === next) return;
      warm?.removeAttribute("data-warm");
      next?.setAttribute("data-warm", "");
      warm = next;
    }

    const onPointer = (event: PointerEvent) => illuminate(event.clientX);
    const onFocus = (event: FocusEvent) => {
      if (!(event.target instanceof HTMLElement)) return;
      const box = event.target.getBoundingClientRect();
      illuminate(box.left + box.width / 2);
    };
    const clear = () => { warm?.removeAttribute("data-warm"); warm = undefined; };

    header.addEventListener("pointermove", onPointer, { passive: true });
    header.addEventListener("pointerleave", clear);
    header.addEventListener("focusin", onFocus);
    header.addEventListener("focusout", clear);

    return () => {
      header.removeEventListener("pointermove", onPointer);
      header.removeEventListener("pointerleave", clear);
      header.removeEventListener("focusin", onFocus);
      header.removeEventListener("focusout", clear);
    };
  }, []);

  useEffect(() => {
    if (!showCharacter || !roof.current) return;
    const garland = roof.current;
    // The roof is fixed. Tuck the figure away once the visitor starts reading.
    const move = () => garland.toggleAttribute("data-away", window.scrollY > 70);
    move();
    window.addEventListener("scroll", move, { passive: true });
    return () => window.removeEventListener("scroll", move);
  }, [showCharacter]);

  return (
    <div ref={roof} className={styles.roof} aria-hidden="true">
      {swags.map((sag, span) => (
        <div key={span} className={styles.swag} style={{ "--sag": sag + "px" } as CSSProperties}>
          <span className={styles.wire} />
          {sockets.map((position, socket) => {
            const index = span * sockets.length + socket;
            const cableY = sag * Math.sqrt(1 - (2 * position - 1) ** 2);
            return (
              <span key={socket} className={styles.lamp} style={{
                left: position * 100 + "%",
                top: cableY - 2 + "px",
                "--bulb": bulbs[index % bulbs.length],
                "--angle": (position - 0.5) * -29 + (index % 3 - 1) * 4 + "deg",
                "--period": 2.8 + (index * 7 % 13) * 0.27 + "s",
                "--delay": -((index * 37 % 31) * 0.37) + "s",
              } as CSSProperties}>
                <span className={styles.bloom} />
                <span className={styles.socket} />
                <span className={styles.glass} />
              </span>
            );
          })}
          {span === swags.length - 1 && showCharacter && (
            <span className={styles.hanger}>
              <Image src="/images/winter/hanging.webp" alt="" width={477} height={716}
                sizes="(max-width: 360px) 142px, (max-width: 700px) clamp(144px, 42vw, 222px), clamp(180px, 24vw, 324px)"
                className={styles.figure} unoptimized />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
