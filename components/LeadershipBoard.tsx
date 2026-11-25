"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { useWinterTheme } from "@/lib/seasonal/useWinterTheme";
import styles from "./LeadershipBoard.module.css";

// Christmas: the portraits join the snowball fight. A visitor's snowball (or one from the fight)
// spins the framed portrait around; another hit while it's spinning sends it round again, faster.
const spins = new WeakMap<HTMLElement, Animation>();
function spinPortrait(frame: HTMLElement, from?: { x: number }) {
  const box = frame.getBoundingClientRect();
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const running = spins.get(frame);
  const again = running?.playState === "running";
  running?.cancel();
  const direction = from && box.left + box.width / 2 < from.x ? -1 : 1;
  const turn = (again ? 720 : 360) * direction;
  const animation = still
    ? frame.animate([{ transform: "rotate(0)" }, { transform: `rotate(${3 * direction}deg)` }, { transform: "rotate(0)" }], { duration: 420, easing: "ease-out" })
    : frame.animate([
      { transform: "perspective(900px) rotateY(0deg)" },
      { transform: `perspective(900px) rotateY(${turn * 1.06}deg) scale(1.03)`, offset: .72 },
      { transform: `perspective(900px) rotateY(${turn * .985}deg)`, offset: .88 },
      { transform: `perspective(900px) rotateY(${turn}deg)` },
    ], { duration: again ? 1250 : 1050, easing: "cubic-bezier(.2,.7,.25,1)" });
  spins.set(frame, animation);
}

type BoardMember = { id: string; name: string; office: string };

// Order of office, as published by the board.
const BOARD: BoardMember[] = [
  { id: "joe-wagner", name: "Joe Wagner", office: "President" },
  { id: "phil-acker", name: "Phil Acker", office: "Vice President" },
  { id: "jeannine-kochman", name: "Jeannine Kochman", office: "Secretary" },
  { id: "suzanne-alberter", name: "Suzanne Alberter", office: "Treasurer" },
  { id: "linda-lehr", name: "Linda Lehr", office: "Board Member" },
  { id: "michael-kempf", name: "Michael Kempf", office: "Board Member" },
];

function BoardPortrait({ member, winter }: { member: BoardMember; winter: boolean }) {
  const src = winter
    ? `/images/winter/leadership/board/${member.id}.webp`
    : `/images/leadership/board/${member.id}.webp`;
  return (
    <Image
      key={src}
      src={src}
      alt={winter ? `${member.name} in a Santa hat and coat` : `Portrait of ${member.name}`}
      fill
      sizes="(min-width: 1440px) 380px, (min-width: 1024px) 30vw, (min-width: 640px) 31vw, 46vw"
      className={styles.photoImg}
    />
  );
}

function HollySprig() {
  return (
    <svg className={styles.holly} viewBox="0 0 64 40" aria-hidden="true" focusable="false">
      <path
        d="M30 22c-6-9-17-12-27-9 4 2 5 5 4 8 3-1 6 0 7 3 2-2 5-2 7 0 1-3 5-4 9-2Z"
        fill="#0f6a3e"
        stroke="#0a4a2b"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M34 22c6-9 17-12 27-9-4 2-5 5-4 8-3-1-6 0-7 3-2-2-5-2-7 0-1-3-5-4-9-2Z"
        fill="#13804b"
        stroke="#0a4a2b"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M8 15c8 0 15 3 22 7M56 15c-8 0-15 3-22 7" stroke="#7fc79a" strokeWidth=".8" fill="none" opacity=".7" />
      <circle cx="28" cy="25" r="5" fill="#c4152f" />
      <circle cx="36" cy="25" r="5" fill="#d91c37" />
      <circle cx="32" cy="31" r="5" fill="#b0102a" />
      <circle cx="26.6" cy="23.4" r="1.5" fill="#ffd9d9" opacity=".9" />
      <circle cx="34.6" cy="23.4" r="1.5" fill="#ffd9d9" opacity=".9" />
      <circle cx="30.6" cy="29.4" r="1.5" fill="#ffd9d9" opacity=".9" />
    </svg>
  );
}

export default function LeadershipBoard({ initialWinter }: { initialWinter: boolean }) {
  const winter = useWinterTheme(initialWinter);
  const section = useRef<HTMLElement>(null);

  // The site-wide snowball fight (WinterSnowballFight) throws at anything tagged data-snow-fighter
  // and announces each hit with a "mems:snow-hit" event.
  useEffect(() => {
    const root = section.current;
    if (!winter || !root) return;
    const onHit = (event: Event) => {
      const frame = (event.target as Element | null)?.closest<HTMLElement>("[data-board-frame]");
      if (frame) spinPortrait(frame, (event as CustomEvent<{ from?: { x: number } }>).detail?.from);
    };
    root.addEventListener("mems:snow-hit", onHit);
    return () => root.removeEventListener("mems:snow-hit", onHit);
  }, [winter]);

  return (
    <section
      ref={section}
      id="board-of-directors"
      aria-labelledby="board-of-directors-title"
      className={`bg-[#040d1a] ${styles.section}`}
    >
      <div className="wrap">
        <header className={styles.head}>
          <p className={styles.eyebrow}>
            <span aria-hidden="true" />
            Millstadt Ambulance Service
          </p>
          <h2 id="board-of-directors-title" className={styles.title}>
            Board of Directors
          </h2>
          <p className={styles.lede}>
            The officers and members who govern the ambulance service and oversee its EMS administration.
          </p>
        </header>

        <div className={styles.stage}>
          <div className={styles.lights} aria-hidden="true">
            <span /><span /><span /><span />
          </div>

          <ol className={styles.grid}>
            {BOARD.map((member) => (
              <li key={member.id} className={styles.card}>
                <figure className={styles.figure}>
                  <div className={styles.frame} data-board-frame="">
                    <div className={styles.photo} data-snow-fighter={winter ? `board-${member.id}` : undefined}
                      data-snow-role={winter ? "target" : undefined}>
                      <BoardPortrait member={member} winter={winter} />
                      <span className={styles.sheen} aria-hidden="true" />
                    </div>
                    <HollySprig />
                  </div>
                  <figcaption className={styles.caption}>
                    <span className={styles.name}>{member.name}</span>
                    <span className={styles.office}>{member.office}</span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ol>
        </div>

      </div>
    </section>
  );
}
