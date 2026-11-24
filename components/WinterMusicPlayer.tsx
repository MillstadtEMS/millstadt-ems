"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useWinterTheme } from "@/lib/seasonal/useWinterTheme";
import styles from "./WinterMusicPlayer.module.css";

const VIDEO = "ByK84WFMaJw";
const SONG = "Christmas Saves the Year";
const YOUTUBE = "https://www.youtube.com";
const FRAME_ID = "winter-song-frame";
const EMBED = `${YOUTUBE}/embed/${VIDEO}?autoplay=1&playsinline=1&controls=1&loop=1&playlist=${VIDEO}&enablejsapi=1`;
const excludedSections = new Set(["admin", "board", "inventory", "lounge", "truckcheck", "ten-eight", "offline", "weather-test"]);

export default function WinterMusicPlayer() {
  const winter = useWinterTheme();
  const pathname = usePathname();
  const section = pathname?.split("/")[1] ?? "";
  if (!winter || excludedSections.has(section)) return null;
  return <MusicStrip />;
}

type TransportCommand = "pauseVideo" | "playVideo";

function messagePlayer(frame: HTMLIFrameElement | null, payload: object) {
  frame?.contentWindow?.postMessage(JSON.stringify({ id: FRAME_ID, channel: "widget", ...payload }), YOUTUBE);
}

function MusicStrip() {
  const [origin, setOrigin] = useState("");
  const [paused, setPaused] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);
  const queued = useRef<TransportCommand | null>(null);
  const open = Boolean(origin);

  useEffect(() => {
    if (!open) return;
    const player = frame.current;
    let attempts = 0;
    function subscribe() {
      messagePlayer(player, { event: "listening" });
      if (++attempts >= 30) window.clearInterval(retry);
    }
    const retry = window.setInterval(subscribe, 350);
    function receive(event: MessageEvent) {
      if (event.origin !== YOUTUBE || event.source !== player?.contentWindow || typeof event.data !== "string") return;
      let update;
      try { update = JSON.parse(event.data); } catch { return; }
      if (!update || typeof update !== "object") return;
      if (update.event === "onReady") {
        window.clearInterval(retry);
        ready.current = true;
        messagePlayer(player, { event: "command", func: "addEventListener", args: ["onStateChange"] });
        if (queued.current) {
          messagePlayer(player, { event: "command", func: queued.current, args: [] });
          queued.current = null;
        }
      }
      const state = update.event === "onStateChange" ? update.info : update.info?.playerState;
      if (state === 1 || state === 3) setPaused(false);
      if (state === 0 || state === 2 || state === 5 || state === -1) setPaused(true);
    }
    window.addEventListener("message", receive);
    player?.addEventListener("load", subscribe);
    return () => {
      window.clearInterval(retry);
      window.removeEventListener("message", receive);
      player?.removeEventListener("load", subscribe);
    };
  }, [open]);

  function togglePlayer() {
    ready.current = false;
    queued.current = null;
    setPaused(false);
    setOrigin(open ? "" : window.location.origin);
  }

  function togglePause() {
    const command: TransportCommand = paused ? "playVideo" : "pauseVideo";
    if (!ready.current) queued.current = command;
    messagePlayer(frame.current, { event: "command", func: command, args: [] });
    setPaused(!paused);
  }
  return (
    <aside className={styles.strip} aria-label="Christmas music">
      <div className={styles.bar}>
        <button type="button" className={styles.toggle} aria-expanded={open}
          aria-controls="winter-music-video" onClick={togglePlayer}>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            {open ? <rect x="4" y="4" width="12" height="12" rx="2" /> : <path d="M5 3.7a.8.8 0 0 1 1.25-.66l10 6.3a.8.8 0 0 1 0 1.32l-10 6.3A.8.8 0 0 1 5 16.3z" />}
          </svg>
          {open ? "Stop music" : "Play Christmas music"}
        </button>
        {open && <button type="button" className={styles.toggle} onClick={togglePause} aria-controls={FRAME_ID}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            {paused ? <path d="m4 2 9 6-9 6Z" /> : <path d="M3 2h4v12H3zm6 0h4v12H9z" />}
          </svg>
          {paused ? "Resume music" : "Pause music"}
        </button>}
        <div className={styles.track}>
          <span className={styles.title}>{SONG}</span>
          <span className={styles.artist}>Twenty One Pilots</span>
        </div>
      </div>
      <div id="winter-music-video" className={styles.player} hidden={!open}>
        {open && <>
          <iframe
            ref={frame} id={FRAME_ID} src={`${EMBED}&origin=${encodeURIComponent(origin)}`} title={`Twenty One Pilots — ${SONG} (Official Video)`}
            referrerPolicy="strict-origin-when-cross-origin"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen
          />
          <a className={styles.watch} href={`https://www.youtube.com/watch?v=${VIDEO}`}
            target="_blank" rel="noopener noreferrer">Open on YouTube <span aria-hidden="true">↗</span></a>
        </>}
      </div>
    </aside>
  );
}
