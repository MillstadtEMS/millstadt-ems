"use client";

import { useEffect, useState } from "react";
import { CALENDAR_EXPLANATION } from "@/lib/financials-hub/transparency-content";

import styles from "./PublicDocumentLibrary.module.css";

const COMPLETED_YEARS = [
  { year: "2022", calls: 618 },
  { year: "2023", calls: 734 },
  { year: "2024", calls: 748 },
  { year: "2025", calls: 880 },
];

export default function AnnualCallSummary({onCurrentCalls}:{onCurrentCalls?:(calls:number|null)=>void}={}) {
  const [currentCalls, setCurrentCalls] = useState<number | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(()=>{onCurrentCalls?.(currentCalls);},[currentCalls,onCurrentCalls]);

  useEffect(() => {
    let active = true;

    async function loadCurrentCalls() {
      try {
        const response = await fetch("/api/cad/log", { cache: "no-store" });
        if (!response.ok) throw new Error(`CAD log returned ${response.status}`);
        const calls: unknown = await response.json();
        if (!Array.isArray(calls)) throw new Error("CAD log was not an array");
        if (active) {
          setCurrentCalls(calls.length);
          setUnavailable(false);
        }
      } catch {
        if (active) setUnavailable(true);
      }
    }

    loadCurrentCalls();
    const interval = window.setInterval(loadCurrentCalls, 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const values = [
    ...COMPLETED_YEARS,
    { year: "2026 through current", calls: currentCalls },
  ];
  const maximum = Math.max(
    ...values.map(({ calls }) => calls ?? 0),
    1,
  );

  return (
    <section id="annual-call-volume" className={styles.callsSection} aria-labelledby="annual-call-volume-title">
      <div className={styles.shell}>
        <div className={styles.callsHeading}>
          <div>
            <p className={styles.eyebrow}>Service activity</p>
            <h2 id="annual-call-volume-title">Annual 911 call volume</h2>
          </div>
          <div className={styles.callExplanation}><p>{CALENDAR_EXPLANATION}</p><p>The 2026 total uses the same live count as the homepage.</p></div>
        </div>

        <div className={styles.callChart}>
          {values.map(({ year, calls }) => (
            <div className={styles.callRow} key={year}>
              <span className={styles.callYear}>{year}</span>
              <span className={styles.callTrack} aria-hidden="true">
                <span
                  className={styles.callBar}
                  style={{ width: calls === null ? "0%" : `${Math.max(4, (calls / maximum) * 100)}%` }}
                />
              </span>
              <strong className={styles.callTotal}>{calls === null ? "-" : calls.toLocaleString()}</strong>
            </div>
          ))}
        </div>

        {currentCalls === null && !unavailable && <p className={styles.callStatus} role="status">Loading the live 2026 total…</p>}
        {unavailable && currentCalls === null && (
          <p className={styles.callStatus}>The live 2026 total is temporarily unavailable.</p>
        )}
        {unavailable && currentCalls !== null && (
          <p className={styles.callStatus} role="status">Showing the last verified 2026 total. Live updates are temporarily unavailable.</p>
        )}

      </div>
    </section>
  );
}
