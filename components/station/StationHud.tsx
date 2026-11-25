"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { currentConditionText, flightAcceptance, type WeatherData } from "@/lib/weather/millstadt";
import { nwsIcon, type StationDisplay } from "@/lib/station/display";
import { centralParts, holidayAt, monthNames, useStationSecond, weekdayNames } from "./stationTime";
import type { StationWeather } from "./useStationWeather";
import styles from "./StationHud.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

/** 24-hour (military) time in Central, with the date under it. */
export function StationClock({ big = false }: { big?: boolean }) {
  const now = useStationSecond();
  const t = now ? centralParts(new Date(now * 1000)) : null;
  return (
    <div className={styles.clockBlock} data-big={big || undefined}>
      <div className={styles.clock} role="timer" aria-label={t ? `${pad(t.hour)}${pad(t.minute)} hours ${t.zone === "CDT" ? "Central Daylight" : "Central Standard"} Time` : "Central time"}>
        <span className={styles.hhmm}>{t ? `${pad(t.hour)}:${pad(t.minute)}` : "--:--"}</span>
        <span className={styles.ss}>
          <b>{t ? pad(t.second) : "--"}</b>
          <small>{t?.zone ?? "CST"}</small>
        </span>
      </div>
      <div className={styles.date}>
        <span className={styles.weekday}>{t ? weekdayNames[t.weekday] : " "}</span>
        <span className={styles.day}>{t ? (big ? `${monthNames[t.month - 1]} ${t.day}, ${t.year}` : `${monthNames[t.month - 1].slice(0, 3)} ${t.day}`) : " "}</span>
      </div>
    </div>
  );
}

/** The countdown to Christmas morning; "Merry Christmas" on the day, then on to the New Year. */
export function StationCountdown() {
  const now = useStationSecond();
  if (!now) return <div className={styles.countdown} aria-hidden="true" />;
  const holiday = holidayAt(now);
  if (holiday.kind === "christmas") return <div className={styles.countdown} data-greeting=""><span className={styles.greeting}>Merry Christmas!</span><small>from Millstadt EMS</small></div>;
  if (holiday.kind === "happy-new-year") return <div className={styles.countdown} data-greeting=""><span className={styles.greeting}>Happy New Year!</span><small>from Millstadt EMS</small></div>;
  if (holiday.kind === "new-year") return <div className={styles.countdown} data-greeting=""><span className={styles.greeting}>Happy Holidays</span><small>{holiday.days} {holiday.days === 1 ? "day" : "days"} to the New Year</small></div>;
  const tiles: Array<[number, string]> = [[holiday.days, holiday.days === 1 ? "Day" : "Days"], [holiday.hours, "Hrs"], [holiday.minutes, "Min"], [holiday.seconds, "Sec"]];
  return (
    <div className={styles.countdown} role="timer" aria-label={`${holiday.days} days, ${holiday.hours} hours and ${holiday.minutes} minutes until Christmas`}>
      <span className={styles.caption} aria-hidden="true">Christmas in</span>
      <span className={styles.tiles} aria-hidden="true">
        {tiles.map(([value, unit], i) => (
          <span key={unit} className={styles.tile}><b>{i ? pad(value) : value}</b><small>{unit}</small></span>
        ))}
      </span>
    </div>
  );
}

function shortTime(ms: number) {
  const t = centralParts(new Date(ms));
  return `${pad(t.hour)}${pad(t.minute)}`;
}

/** Current conditions, the next two forecast periods and the medical-helicopter estimate (shared with /weather). */
export function StationWeatherPanel({ weather, display, wide = false }: { weather: StationWeather; display: StationDisplay | null; wide?: boolean }) {
  const { data, status, updatedAt } = weather;
  if (!data) {
    return (
      <div className={styles.weather} data-empty="">
        <span className={styles.weatherNote}>{status === "loading" ? "Loading Millstadt weather…" : "Weather is unavailable right now. Retrying…"}</span>
      </div>
    );
  }
  return <WeatherReport data={data} stale={status === "stale"} updatedAt={updatedAt} display={display} wide={wide} />;
}

function WeatherReport({ data, stale, updatedAt, display, wide }: { data: WeatherData; stale: boolean; updatedAt: number | null; display: StationDisplay | null; wide: boolean }) {
  const temp = data.current.tempF != null ? Math.round(data.current.tempF) : data.periods[0]?.temperature ?? null;
  const condition = currentConditionText(data);
  const icon = data.periods[0]?.icon ? nwsIcon(data.periods[0].icon, display) : null;
  const next = data.periods.slice(0, wide ? 4 : 2);
  const flight = flightAcceptance(data);
  const alert = data.alerts[0]?.properties.event;
  return (
    <div className={styles.weather}>
      <div className={styles.now}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {icon && <img className={styles.icon} src={icon} alt="" width={86} height={86} />}
        <div className={styles.nowText}>
          <span className={styles.temp}>{temp != null ? `${temp}°` : "—"}<small>F</small></span>
          <span className={styles.condition}>{condition}</span>
        </div>
      </div>
      <ul className={styles.forecast} aria-label="Forecast">
        {alert && <li className={styles.alert}>{alert}</li>}
        {next.slice(0, alert ? Math.max(1, next.length - 1) : next.length).map((period) => (
          <li key={period.name}><b>{period.name}</b> <span>{period.temperature}°</span> <em>{period.shortForecast}</em></li>
        ))}
      </ul>
      <div className={styles.flight} data-status={flight.status} title={flight.reason}>
        <span className={styles.flightLabel}>Med helicopter <i>est.</i></span>
        <span className={styles.flightStatus}>{flight.status === "flying" ? "Likely to accept flight" : "Unlikely to accept flight"}</span>
      </div>
      {stale && updatedAt && <span className={styles.stale}>As of {shortTime(updatedAt)}</span>}
    </div>
  );
}

/** The big Sound on/off button for the living-room TV. It drives the player's own toggle, so the
 *  music, its mute state and the site's player stay one and the same. Remote-friendly: any arrow
 *  key brings focus here, Enter or OK toggles it, and so do M and the remote's play/pause key. */
export function StationSoundButton() {
  const [on, setOn] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let watch: MutationObserver | null = null;
    let poll = 0;
    const find = () => {
      const toggle = document.getElementById("winter-sound-toggle");
      if (!toggle) return false;
      const sync = () => setOn(toggle.getAttribute("aria-pressed") === "true");
      sync();
      watch = new MutationObserver(sync);
      watch.observe(toggle, { attributes: true, attributeFilter: ["aria-pressed"] });
      return true;
    };
    if (!find()) poll = window.setInterval(() => { if (find()) window.clearInterval(poll); }, 400);
    return () => { window.clearInterval(poll); watch?.disconnect(); };
  }, []);

  useEffect(() => {
    const arrows = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (arrows.has(event.key) && document.activeElement !== button.current) {
        event.preventDefault();
        button.current?.focus();
      } else if (event.key === "m" || event.key === "M" || event.key === "MediaPlayPause") {
        event.preventDefault();
        document.getElementById("winter-sound-toggle")?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const label = on ? "Turn the Christmas music off" : "Turn the Christmas music on";
  return (
    <button ref={button} type="button" className={styles.sound} data-on={on || undefined} aria-pressed={on} aria-label={label} title={label}
      onClick={() => document.getElementById("winter-sound-toggle")?.click()}>
      {on ? <Bell aria-hidden="true" /> : <BellOff aria-hidden="true" />}
      <span>{on ? "Sound on" : "Sound off"}</span>
    </button>
  );
}
