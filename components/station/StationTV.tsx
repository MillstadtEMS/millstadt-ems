"use client";

import { useLayoutEffect, useState, useEffect, type CSSProperties } from "react";
import WinterRoofline from "@/components/WinterRoofline";
import WinterMusicPlayer from "@/components/WinterMusicPlayer";
import WinterVillage from "@/components/WinterVillage";
import WinterSnowballAmbush from "@/components/WinterSnowballAmbush";
import WinterSnowballFight from "@/components/WinterSnowballFight";
import AmboScroll from "@/components/AmboScroll";
import musicStyles from "@/components/WinterMusicPlayer.module.css";
import { useWinterTheme } from "@/lib/seasonal/useWinterTheme";
import { detectDisplay, type StationDisplay } from "@/lib/station/display";
import { clearStationFlag, setStationFlag, stationDebug } from "@/lib/station/flags";
import { StationClock, StationCountdown, StationHelicopter, StationSoundButton, StationWeatherNow } from "./StationHud";
import { useStationWeather } from "./useStationWeather";
import { useHighestVideoRendition } from "./useStationVideo";
import StationDirector from "./StationDirector";
import StationKeeper from "./StationKeeper";
import StationDebug from "./StationDebug";
import StationSky from "./StationSky";
import styles from "./StationTV.module.css";

// The station TV: one screen, hands-free, all season. Across the top, the time, date, countdown,
// weather and helicopter estimate, with the Christmas lights strung along the bottom of that bar and
// the six crew hanging from them exactly as on the site. Under them the living room, its little TV
// on its stand playing the music video, and below that the village (Christmas in Millstadt, the rink
// and all) as the main display, with the snowball fight, the pop-ups and the drive-by running on
// their own. Everything is the site's own components, so every fix to them shows up here too.

// The living room is drawn at 760 x 200; on the TV it is 18.5% of the screen height (on a phone held
// upright, the full width of the screen).
const ROOM_SHARE = 18.5;
const ROOM_WIDTH = 760;
// --u: 1% of the screen height, or less on a screen narrower than 16:9 (the layout is designed for 16:9).
const unitFor = (width: number, height: number) => Math.min(height / 100, width * .005625);
const roomScale = (width: number, height: number) =>
  width < height ? width / ROOM_WIDTH : unitFor(width, height) * ROOM_SHARE / 200;

/** Keep the site's sound preference out of the station: the TV starts muted (browsers block
 *  autoplay with sound) and the site gets its own setting back when the station closes. */
function useMutedStart() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const key = "mems:winter-sound";
    let previous: string | null = null;
    try { previous = window.localStorage.getItem(key); window.localStorage.setItem(key, "off"); } catch { /* storage blocked: the player starts muted anyway */ }
    setReady(true);
    return () => {
      try {
        if (previous === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, previous);
      } catch { /* nothing to restore */ }
    };
  }, []);
  return ready;
}

export default function StationTV({ initialWinter, driveBy, review = false }: { initialWinter: boolean; driveBy: boolean; review?: boolean }) {
  const winter = useWinterTheme(initialWinter);
  const [display, setDisplay] = useState<StationDisplay | null>(null);
  const [debug, setDebug] = useState(false);
  const weather = useStationWeather();
  const playerReady = useMutedStart();
  useHighestVideoRendition();

  // Size everything from the screen: --u and the living room's scale, which CSS can't derive as a
  // plain number. html[data-station] turns on the station-only CSS for the shared pieces.
  useLayoutEffect(() => {
    const html = document.documentElement;
    setStationFlag();
    const size = () => {
      const width = window.innerWidth, height = window.innerHeight;
      html.style.setProperty("--station-u", `${unitFor(width, height).toFixed(3)}px`);
      html.style.setProperty("--station-room-k", roomScale(width, height).toFixed(4));
      const next = detectDisplay();
      html.dataset.stationTier = next.tier;
      setDisplay(next);
    };
    size();
    setDebug(stationDebug());
    window.addEventListener("resize", size);
    // The postcard's own proportions (town and rink, or just the town in a calm, still version), so
    // the whole of it fits the space under the living room whatever it holds.
    let watch: ResizeObserver | null = null, frame = 0;
    const fit = () => {
      frame = 0;
      const village = document.getElementById("christmas-in-millstadt");
      const box = village?.getBoundingClientRect();
      if (!box?.width || !box.height) return;
      const ratio = box.height / box.width;
      const current = parseFloat(html.style.getPropertyValue("--village-ratio")) || 0;
      if (Math.abs(ratio - current) > .004) html.style.setProperty("--village-ratio", ratio.toFixed(4));
    };
    const queue = () => { if (!frame) frame = requestAnimationFrame(fit); };
    const attach = () => {
      const village = document.getElementById("christmas-in-millstadt");
      if (!village || typeof ResizeObserver === "undefined") return false;
      watch = new ResizeObserver(queue);
      watch.observe(village);
      queue();
      return true;
    };
    const retry = attach() ? 0 : window.setInterval(() => { if (attach()) window.clearInterval(retry); }, 500);
    return () => {
      window.removeEventListener("resize", size);
      window.clearInterval(retry);
      cancelAnimationFrame(frame);
      watch?.disconnect();
      clearStationFlag();
      delete html.dataset.stationTier;
      html.style.removeProperty("--station-u");
      html.style.removeProperty("--station-room-k");
      html.style.removeProperty("--village-ratio");
    };
  }, []);

  if (!winter) {
    return (
      <div className={styles.offSeason} data-review={review || undefined}>
        <StationClock big />
        <div className={styles.offWeather}>
          <StationWeatherNow weather={weather} wide />
          <StationHelicopter weather={weather} big />
        </div>
        <p className={styles.offBrand}>Millstadt EMS</p>
        <StationKeeper review={review} />
        {debug && <StationDebug display={display} weatherAt={weather.updatedAt} />}
      </div>
    );
  }

  return (
    <div className={styles.station} data-review={review || undefined}>
      {/* Pop-ups keep clear of the bar (data-winter-player is their keep-clear marker). */}
      <header className={styles.hud} data-station-hud="" data-winter-player="">
        <div className={styles.hudLeft}>
          <StationClock />
          <StationCountdown />
        </div>
        {/* Right above the living-room TV it drives. */}
        <div className={styles.hudCenter}><StationSoundButton /></div>
        <div className={styles.hudRight}>
          <StationWeatherNow weather={weather} />
          <StationHelicopter weather={weather} />
        </div>
        <WinterRoofline station />
      </header>

      <section className={styles.band} aria-label="The living room">
        <div className={styles.bandScale} style={{ "--band-width": "calc(100vw / var(--station-room-k))" } as CSSProperties}>
          <div className={musicStyles.stage}>{playerReady && <WinterMusicPlayer />}</div>
        </div>
      </section>

      {/* The village region: one container, so a panel can be layered over it. */}
      <section className={styles.globe} data-station-village="" aria-label="Christmas in Millstadt">
        <StationSky />
        <div className={styles.globeFrame}><WinterVillage /></div>
      </section>

      <WinterSnowballAmbush pathname="/station" />
      <WinterSnowballFight />
      {/* The drive-by's lanes are fixed to the screen; on a still-motion TV its parked picture stands
          in the bottom right corner instead of taking a row of the screen. */}
      <div className={styles.driveBy}><AmboScroll enabled={driveBy} /></div>
      <StationDirector />
      <StationKeeper review={review} />
      {debug && <StationDebug display={display} weatherAt={weather.updatedAt} />}
    </div>
  );
}
