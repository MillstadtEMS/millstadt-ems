"use client";

import { useEffect } from "react";
import styles from "./StationTV.module.css";

/** Shown when the station couldn't check its sign-in (the password store didn't answer): a calm
 *  screen that tries again on its own every minute or so, and as soon as the network comes back. */
export default function StationRetry() {
  useEffect(() => {
    const reload = () => window.location.reload();
    const timer = window.setTimeout(reload, 45_000 + Math.random() * 30_000);
    window.addEventListener("online", reload);
    return () => { window.clearTimeout(timer); window.removeEventListener("online", reload); };
  }, []);
  return (
    <div className={styles.retry} role="status">
      <p className={styles.retryTitle}>Millstadt EMS</p>
      <p className={styles.retryNote}>Reconnecting the station TV…</p>
    </div>
  );
}
