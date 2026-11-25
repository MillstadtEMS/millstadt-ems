import type { Metadata, Viewport } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { isStationAuthed, safeStationPath, stationPasswordStatus } from "@/lib/station/auth";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Station TV sign in",
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
};

export const viewport: Viewport = { themeColor: "#050b18" };

const messages: Record<string, string> = {
  password: "That password didn't match. Try again.",
  wait: "Too many tries. Wait 15 minutes, then try again.",
  setup: "The station TV password hasn't been set yet. An admin can set it in Admin › Station TV.",
  unavailable: "The station TV can't check passwords right now. Try again in a minute.",
};

// Sized for a TV across the room: a huge field and button, focused on arrival, Enter (or the remote's
// OK) signs in.
export default async function StationLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const next = safeStationPath(query.next);
  if (await isStationAuthed()) redirect(next);
  const status = await stationPasswordStatus();
  const unset = status === "unset";
  const error = unset ? messages.setup : typeof query.error === "string" ? messages[query.error] : undefined;

  return (
    <div className={styles.screen}>
      <form className={styles.card} action="/api/station/login" method="post">
        <Image className={styles.wordmark} src="/images/winter/kit/millstadt-wordmark.png" alt="Millstadt" width={900} height={368} loading="eager" unoptimized />
        <p className={styles.eyebrow}>Millstadt EMS · Station TV</p>
        <h1 className={styles.title}>Sign in this TV</h1>
        <p className={styles.lead}>Once signed in, this screen stays on the station dashboard and keeps itself signed in.</p>
        <label className={styles.label} htmlFor="station-password">Station password</label>
        <input id="station-password" className={styles.input} name="password" type="password" autoComplete="current-password"
          maxLength={256} required autoFocus disabled={unset} enterKeyHint="go" />
        <input name="next" type="hidden" value={next} />
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button className={styles.button} type="submit" disabled={unset}>Open the station TV</button>
        <p className={styles.help}>Need the password? An admin can set a new one in Admin › Station TV.</p>
      </form>
    </div>
  );
}
