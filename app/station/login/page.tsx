import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { isStationAuthed, safeStationPath, stationPasswordSource } from "@/lib/station/auth";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Station TV sign in",
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
};

const messages: Record<string, string> = {
  password: "That password didn't match. Try again.",
  wait: "Too many tries. Wait 15 minutes, then try again.",
  setup: "The station TV password hasn't been set up yet. An admin can set it in Admin › Station TV.",
};

export default async function StationLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const next = safeStationPath(query.next);
  if (await isStationAuthed()) redirect(next);
  const error = typeof query.error === "string" ? messages[query.error] : undefined;
  const unset = (await stationPasswordSource()) === "unset";

  return (
    <div className={styles.screen}>
      <form className={styles.card} action="/api/station/login" method="post">
        <Image className={styles.wordmark} src="/images/winter/kit/millstadt-wordmark.png" alt="Millstadt" width={900} height={368} priority unoptimized />
        <p className={styles.eyebrow}>Millstadt EMS · Station TV</p>
        <h1 className={styles.title}>Sign in this TV</h1>
        <p className={styles.lead}>Once signed in, this screen stays on the station dashboard and signs itself back in every day.</p>
        <label className={styles.label} htmlFor="station-password">Station password</label>
        <input id="station-password" className={styles.input} name="password" type="password" autoComplete="current-password"
          maxLength={256} required autoFocus disabled={unset} />
        <input name="next" type="hidden" value={next} />
        {(error || unset) && <p className={styles.error} role="alert">{error ?? messages.setup}</p>}
        <button className={styles.button} type="submit" disabled={unset}>Open the station TV</button>
        <p className={styles.help}>Need the password? An admin can set a new one in Admin › Station TV.</p>
      </form>
    </div>
  );
}
