"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { currentConditionText, flightAcceptance, metarFlightCategory, type MetarData } from "@/lib/weather/millstadt";
import { centralParts, holidayAt, monthNames, useStationSecond, weekdayNames } from "./stationTime";
import type { StationWeather } from "./useStationWeather";
import WeatherIcon, { weatherKind } from "./WeatherIcon";
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
        {t ? <>
          <span className={styles.weekday}>{weekdayNames[t.weekday]}</span>
          <span className={styles.day}>{big ? `${monthNames[t.month - 1]} ${t.day}, ${t.year}` : `${monthNames[t.month - 1]} ${t.day}`}</span>
        </> : <span className={styles.day}>&nbsp;</span>}
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

function Waiting({ status }: { status: StationWeather["status"] }) {
  return <span className={styles.weatherNote}>{status === "loading" ? "Loading Millstadt weather…" : "Weather unavailable. Retrying…"}</span>;
}

/** Now: the icon, temperature and conditions, any NWS alert, and the next forecast period. */
export function StationWeatherNow({ weather, wide = false }: { weather: StationWeather; wide?: boolean }) {
  const { data, status, updatedAt } = weather;
  if (!data) return <div className={styles.weather} data-empty=""><Waiting status={status} /></div>;
  const temp = data.current.tempF != null ? Math.round(data.current.tempF) : data.periods[0]?.temperature ?? null;
  const condition = currentConditionText(data);
  const night = data.periods[0] ? !data.periods[0].isDaytime : false;
  const alert = data.alerts[0]?.properties.event;
  const next = data.periods.slice(0, wide ? 3 : 1);
  return (
    <div className={styles.weather} data-wide={wide || undefined}>
      <WeatherIcon kind={weatherKind(data)} night={night} className={styles.icon} />
      <div className={styles.weatherText}>
        {alert && <span className={styles.alert}>{alert}</span>}
        <span className={styles.nowLine}>
          <span className={styles.temp}>{temp != null ? `${temp}°` : "—"}<small>F</small></span>
          <span className={styles.condition}>{condition}</span>
        </span>
        <ul className={styles.forecast} aria-label="Forecast">
          {next.map((period) => (
            <li key={period.name}><b>{period.name}</b> <span>{period.temperature}°</span> <em>{period.shortForecast}</em></li>
          ))}
        </ul>
        {status === "stale" && updatedAt && <span className={styles.stale}>As of {shortTime(updatedAt)}</span>}
      </div>
    </div>
  );
}

// The two long sentences of the shared estimate, said in fewer words for a TV across the room
// (same meaning; every other reason is shown word for word).
const shorterReasons: Record<string, string> = {
  "Visibility and ceilings are currently favorable for helicopter operations.": "Visibility and ceilings are favorable.",
  "Marginal conditions suggest possible flight restrictions.": "Marginal conditions: flights may be restricted.",
};
const categoryNames: Record<NonNullable<MetarData["flightCategory"]>, string> = {
  VFR: "VFR", MVFR: "MVFR", IFR: "IFR", LIFR: "LIFR",
};

/** The medical-helicopter flight-acceptance estimate, exactly as /weather computes it (lib/weather). */
export function StationHelicopter({ weather, big = false }: { weather: StationWeather; big?: boolean }) {
  const { data, status } = weather;
  if (!data) {
    return (
      <div className={styles.heli} data-status="unknown" data-big={big || undefined}>
        <span className={styles.heliLabel}>Helicopters</span>
        <span className={styles.heliNote}>{status === "loading" ? "Checking flight weather…" : "Flight weather unavailable"}</span>
      </div>
    );
  }
  const result = flightAcceptance(data);
  const category = metarFlightCategory(data.metar);
  const reason = shorterReasons[result.reason] ?? result.reason;
  return (
    <div className={styles.heli} data-status={result.status} data-big={big || undefined} role="status" aria-label={`Helicopters: ${result.title.toLowerCase()}. ${result.reason}`}>
      <span className={styles.heliTop}>
        <span className={styles.heliLabel}>Helicopters</span>
        {category && <span className={styles.heliCategory} data-category={category} title={`METAR flight category at ${data.metar?.icaoId ?? "KALN"}`}>{categoryNames[category]}</span>}
      </span>
      <span className={styles.heliStatus}>{result.status === "flying" ? "Likely to accept flight" : "Unlikely to accept flight"}</span>
      <span className={styles.heliReason}>{reason}</span>
      <span className={styles.heliNote}>Weather-based estimate{category ? ` · ${data.metar?.icaoId ?? "KALN"} METAR` : ""}</span>
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
  // data-snow-own-click: the snowball fight leaves this button's presses alone (it takes clicks
  // elsewhere on the page as throws, and Time Out never pauses it on the station).
  return (
    <button ref={button} type="button" className={styles.sound} data-on={on || undefined} aria-pressed={on} aria-label={label} title={label}
      data-snow-own-click="" onClick={() => document.getElementById("winter-sound-toggle")?.click()}>
      {on ? <Bell aria-hidden="true" /> : <BellOff aria-hidden="true" />}
      <span>{on ? "Sound on" : "Sound off"}</span>
    </button>
  );
}
