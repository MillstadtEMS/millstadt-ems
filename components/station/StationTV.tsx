"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import WinterRoofline from "@/components/WinterRoofline";
import WinterMusicPlayer from "@/components/WinterMusicPlayer";
import WinterVillage from "@/components/WinterVillage";
import WinterSnowballAmbush from "@/components/WinterSnowballAmbush";
import WinterSnowballFight from "@/components/WinterSnowballFight";
import AmboScroll from "@/components/AmboScroll";
import musicStyles from "@/components/WinterMusicPlayer.module.css";
import { useWinterTheme } from "@/lib/seasonal/useWinterTheme";
import { detectDisplay, type StationDisplay } from "@/lib/station/display";
import { STATION_ATTRIBUTE } from "@/lib/station/flags";
import { StationClock, StationCountdown, StationSoundButton, StationWeatherPanel } from "./StationHud";
import { useStationWeather } from "./useStationWeather";
import StationDirector from "./StationDirector";
import styles from "./StationTV.module.css";

// The station TV: one screen, hands-free, all season. Across the top, the time, date, countdown and
// weather, with the Christmas lights strung along the bottom of that bar and the six crew hanging
// from them exactly as on the site. Under them the living room, its old TV playing the music video,
// and below that the village (Christmas in Millstadt, the rink and all) as the main display, with the
// snowball fight, the pop-ups and the drive-by running on their own. Everything is the site's own
// components, so every fix to them shows up here too.

// The living room is drawn at 760 x 200; on the TV it is 18.5% of the screen height.
const ROOM_SHARE = 18.5;
const unitFor = (width: number, height: number) => Math.min(height / 100, width * .005625);

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
  const root = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState<StationDisplay | null>(null);
  const weather = useStationWeather();
  const playerReady = useMutedStart();

  // Size everything from the screen: --u (1% of the height, or less on a narrow screen) and the
  // living room's scale, which CSS can't derive as a plain number.
  useLayoutEffect(() => {
    const html = document.documentElement;
    html.setAttribute(STATION_ATTRIBUTE, "");
    const size = () => {
      const unit = unitFor(window.innerWidth, window.innerHeight);
      html.style.setProperty("--station-u", `${unit.toFixed(3)}px`);
      html.style.setProperty("--station-room-k", (unit * ROOM_SHARE / 200).toFixed(4));
      const next = detectDisplay();
      html.dataset.stationTier = next.tier;
      setDisplay(next);
    };
    size();
    window.addEventListener("resize", size);
    return () => {
      window.removeEventListener("resize", size);
      html.removeAttribute(STATION_ATTRIBUTE);
      delete html.dataset.stationTier;
      html.style.removeProperty("--station-u");
      html.style.removeProperty("--station-room-k");
    };
  }, []);

  if (!winter) {
    return (
      <div ref={root} className={styles.offSeason} data-review={review || undefined}>
        <StationClock big />
        <div className={styles.offWeather}><StationWeatherPanel weather={weather} display={display} wide /></div>
        <p className={styles.offBrand}>Millstadt EMS</p>
      </div>
    );
  }

  return (
    <div ref={root} className={styles.station} data-review={review || undefined}>
      {/* Pop-ups keep clear of the bar (data-winter-player is their keep-clear marker). */}
      <header className={styles.hud} data-station-hud="" data-winter-player="">
        <div className={styles.hudLeft}>
          <StationClock />
          <StationSoundButton />
        </div>
        <div className={styles.hudCenter}><StationCountdown /></div>
        <div className={styles.hudRight}><StationWeatherPanel weather={weather} display={display} /></div>
        <WinterRoofline station />
      </header>

      <section className={styles.band} aria-label="The living room">
        <div className={styles.bandScale} style={{ "--band-width": "calc(100vw / var(--station-room-k))" } as CSSProperties}>
          <div className={musicStyles.stage}>{playerReady && <WinterMusicPlayer />}</div>
        </div>
      </section>

      {/* The village region: one container, so a panel can be layered over it later. */}
      <section className={styles.globe} data-station-village="" aria-label="Christmas in Millstadt">
        <div className={styles.globeFrame}><WinterVillage /></div>
      </section>

      <WinterSnowballAmbush pathname="/station" />
      <WinterSnowballFight />
      <AmboScroll enabled={driveBy} />
      <StationDirector />
    </div>
  );
}
