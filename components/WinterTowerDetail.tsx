"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import styles from "./WinterTowerDetail.module.css";

export default function WinterTowerDetail() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const id = useId();

  function showDetail() {
    if (!dialog.current || dialog.current.open) return;
    dialog.current.showModal();
    setOpen(true);
    closeButton.current?.focus({ preventScroll: true });
  }

  return (
    <>
      <button ref={trigger} type="button" className={styles.trigger}
        aria-haspopup="dialog" aria-controls={id} onClick={showDetail}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5.5 7.5 12 3l6.5 4.5Z M6.5 8v5.1q5.5 4.2 11 0V8 M7.6 14l-2 7 M16.4 14l2 7 M6.8 18h10.4" />
        </svg>
        View tower logo
      </button>
      <dialog ref={dialog} id={id} aria-labelledby={id + "-heading"} aria-describedby={id + "-caption"}
        className={styles.dialog} onClose={() => {
          setOpen(false);
          trigger.current?.focus({ preventScroll: true });
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const box = event.currentTarget.getBoundingClientRect();
          if (event.clientX < box.left || event.clientX >= box.right ||
              event.clientY < box.top || event.clientY >= box.bottom) dialog.current?.close();
        }}>
        <div className={styles.card}>
          <header className={styles.header}>
            <h3 id={id + "-heading"}>Millstadt’s Tin Man</h3>
            <button type="button" ref={closeButton} className={styles.close}
              onClick={() => dialog.current?.close()}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="m5 5 10 10M15 5 5 15" />
              </svg>
              Close
            </button>
          </header>
          <div className={styles.imageFrame}>
            {open && (
              <Image src="/images/winter/tower-detail.webp" alt="On the silver tank, “VILLAGE OF” arches over “millStadt,” with a windmill woven into the black Gothic lettering."
                fill sizes="(max-width: 540px) 92vw, 520px" loading="eager" unoptimized />
            )}
          </div>
          <p id={id + "-caption"}>The village’s windmill emblem is painted on the restored 1931 water tower.</p>
          <p className={styles.credit}>
            <a href="https://www.stlpr.org/show/st-louis-on-the-air/2025-10-24/landmarks-illinois-awards-honor-historic-preservation-projects-millstadt-granite-city">
              Photographic reconstruction from images by Scott Olson Photography and Landmarks Illinois.
            </a>
          </p>
        </div>
      </dialog>
    </>
  );
}
