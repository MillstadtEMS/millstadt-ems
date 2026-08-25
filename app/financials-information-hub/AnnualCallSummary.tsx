"use client";

import { useEffect, useState } from "react";

import styles from "./PublicDocumentLibrary.module.css";

const COMPLETED_YEARS = [
  { year: "2022", calls: 618 },
  { year: "2023", calls: 734 },
  { year: "2024", calls: 748 },
  { year: "2025", calls: 880 },
];

export default function AnnualCallSummary() {
  const [currentCalls, setCurrentCalls] = useState<number | null>(null);
  const [unavailable, setUnavailable] = useState(false);

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
    <section className={styles.callsSection} aria-labelledby="annual-call-volume-title">
      <div className={styles.shell}>
        <div className={styles.callsHeading}>
          <div>
            <p className={styles.eyebrow}>Service activity</p>
            <h2 id="annual-call-volume-title">Annual 911 call volume</h2>
          </div>
          <p>Yearly totals only. The 2026 total uses the same live count as the homepage.</p>
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

        {unavailable && currentCalls === null && (
          <p className={styles.callStatus}>The live 2026 total is temporarily unavailable.</p>
        )}

        <div className={styles.personnelSummary} aria-labelledby="personnel-summary-title">
          <div className={styles.personnelHeading}>
            <p className={styles.eyebrow}>Our team</p>
            <h2 id="personnel-summary-title">Number of personnel</h2>
          </div>
          <dl className={styles.personnelGrid}>
            <div><dt>EMTs</dt><dd>18</dd></div>
            <div><dt>Paramedics</dt><dd>9</dd></div>
            <div><dt>Pre-Hospital Registered Nurse</dt><dd>1</dd></div>
            <div><dt>Advanced Practice Prehospital Registered Nurse Practitioners</dt><dd>2</dd></div>
            <div className={styles.personnelTotal}><dt>Total personnel</dt><dd>30</dd></div>
          </dl>
        </div>
      </div>
    </section>
  );
}
