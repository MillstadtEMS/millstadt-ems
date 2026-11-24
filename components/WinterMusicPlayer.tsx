"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, BellOff, Maximize2, Minimize2 } from "lucide-react";
import { useWinterTheme } from "@/lib/seasonal/useWinterTheme";
import styles from "./WinterMusicPlayer.module.css";

const excluded = new Set(["admin", "api", "board", "inventory", "lounge", "truckcheck", "ten-eight", "offline", "weather-test"]);
const preferenceKey = "mems:winter-sound";
const frameId = "winter-soundtrack";
const youtube = "https://www.youtube.com";
const video = "ByK84WFMaJw";

function ownedRecordingPath() {
  const path = process.env.NEXT_PUBLIC_WINTER_SOUNDTRACK_PATH;
  if (!path?.startsWith("/") || path.startsWith("//")) return null;
  try {
    const url = new URL(path, window.location.origin);
    return url.origin === window.location.origin ? url.pathname + url.search : null;
  } catch { return null; }
}

function wantsSound() {
  try { return window.localStorage.getItem(preferenceKey) !== "off"; } catch { return true; }
}

function send(frame: HTMLIFrameElement | null, payload: object) {
  frame?.contentWindow?.postMessage(JSON.stringify({ id: frameId, channel: "widget", ...payload }), youtube);
}

function command(frame: HTMLIFrameElement | null, func: string, args: string[] = []) {
  send(frame, { event: "command", func, args });
}

function visibleForAutoplay(frame: HTMLIFrameElement) {
  if (document.hidden) return false;
  const box = frame.getBoundingClientRect();
  const header = document.querySelector(".mems-nav-bar")?.getBoundingClientRect().bottom ?? 0;
  const height = Math.max(0, Math.min(box.bottom, window.innerHeight) - Math.max(box.top, header, 0));
  const width = Math.max(0, Math.min(box.right, window.innerWidth) - Math.max(box.left, 0));
  return width * height > box.width * box.height / 2;
}

export default function WinterMusicPlayer() {
  const winter = useWinterTheme();
  const pathname = usePathname();
  if (!winter || excluded.has(pathname?.split("/")[1] ?? "")) return null;
  return <Soundtrack />;
}

function Soundtrack() {
  const [enabled, setEnabled] = useState(wantsSound);
  const [recordingPath, setRecordingPath] = useState(ownedRecordingPath);
  const [expanded, setExpanded] = useState(false);
  const desired = useRef(enabled);
  const frame = useRef<HTMLIFrameElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const bell = useRef<HTMLButtonElement>(null);
  const started = useRef(false);
  const ready = useRef(false);
  const needsGesture = useRef(false);

  function tryStart() {
    if (started.current || document.hidden) return;
    if (audio.current) {
      void audio.current.play().catch(() => {});
    } else if (ready.current && frame.current && visibleForAutoplay(frame.current)) {
      command(frame.current, "playVideo");
    }
  }

  useEffect(() => {
    const player = frame.current;
    const local = audio.current;
    let subscription = 0;
    let attempts = 0;
    function listen() {
      if (!ready.current && ++attempts <= 35) send(player, { event: "listening" });
      else window.clearInterval(subscription);
    }
    function subscribe() {
      window.clearInterval(subscription);
      attempts = 0;
      subscription = window.setInterval(listen, 300);
      listen();
    }
    function receive(event: MessageEvent) {
      if (!player || event.source !== player.contentWindow || event.origin !== youtube || typeof event.data !== "string") return;
      let update;
      try { update = JSON.parse(event.data); } catch { return; }
      if (update?.event === "onReady") {
        const first = !ready.current;
        ready.current = true;
        window.clearInterval(subscription);
        if (first) {
          command(player, "addEventListener", ["onStateChange"]);
          command(player, "addEventListener", ["onAutoplayBlocked"]);
          command(player, desired.current ? "unMute" : "mute");
          tryStart();
        }
      }
      const state = update?.event === "onStateChange" ? update.info : update?.info?.playerState;
      if (state === 1) started.current = true;
      if (desired.current && typeof update?.info?.muted === "boolean" && started.current) {
        needsGesture.current = update.info.muted;
      }
      if (update?.event === "onAutoplayBlocked" && desired.current && !needsGesture.current) {
        needsGesture.current = true;
        command(player, "mute");
        if (visibleForAutoplay(player)) command(player, "playVideo");
      }
    }
    function retryOnGesture(event: Event) {
      if (!event.isTrusted || bell.current?.contains(event.target as Node)) return;
      if (event instanceof KeyboardEvent && (event.repeat || event.ctrlKey || event.altKey || event.metaKey)) return;
      if (player && desired.current && needsGesture.current) {
        command(player, "unMute");
        if (visibleForAutoplay(player)) command(player, "playVideo");
      }
      tryStart();
    }
    const observer = player ? new IntersectionObserver(tryStart, { threshold: [0, 0.5, 0.51, 0.75, 1] }) : null;
    window.addEventListener("message", receive);
    document.addEventListener("visibilitychange", tryStart);
    window.addEventListener("click", retryOnGesture, true);
    window.addEventListener("keydown", retryOnGesture, true);
    window.addEventListener("touchend", retryOnGesture, { passive: true, capture: true });
    if (player) {
      observer?.observe(player);
      player.addEventListener("load", subscribe);
      const params = new URLSearchParams({
        autoplay: visibleForAutoplay(player) ? "1" : "0", mute: desired.current ? "0" : "1",
        enablejsapi: "1", playsinline: "1", controls: "1", loop: "1", playlist: video, origin: window.location.origin,
      });
      player.src = `${youtube}/embed/${video}?${params}`;
      subscribe();
    } else if (local) {
      local.muted = !desired.current;
      tryStart();
    }
    return () => {
      observer?.disconnect();
      window.clearInterval(subscription);
      player?.removeEventListener("load", subscribe);
      local?.pause();
      ready.current = false;
      started.current = false;
      needsGesture.current = false;
      window.removeEventListener("message", receive);
      document.removeEventListener("visibilitychange", tryStart);
      window.removeEventListener("click", retryOnGesture, true);
      window.removeEventListener("keydown", retryOnGesture, true);
      window.removeEventListener("touchend", retryOnGesture, true);
    };
  }, [recordingPath]);

  function toggleSound() {
    const on = !desired.current;
    desired.current = on;
    needsGesture.current = false;
    setEnabled(on);
    try { window.localStorage.setItem(preferenceKey, on ? "on" : "off"); } catch { /* Remember within the current page. */ }
    if (audio.current) audio.current.muted = !on;
    else command(frame.current, on ? "unMute" : "mute");
    tryStart();
  }
  const label = enabled ? "Mute Christmas music" : "Unmute Christmas music";
  const control = (
    <button id="winter-sound-toggle" ref={bell} className={styles.toggle} type="button"
      aria-label={label} title={label} aria-controls={frameId} aria-pressed={enabled} onClick={toggleSound}>
      {enabled ? <Bell size={19} aria-hidden /> : <BellOff size={19} aria-hidden />}
    </button>
  );
  if (recordingPath) {
    return (
      <aside className={styles.audioOnly} aria-label="Christmas soundtrack">
        {control}
        <audio id={frameId} ref={audio} src={recordingPath} autoPlay loop preload="auto" muted={!enabled}
          aria-label="Christmas Saves the Year by Twenty One Pilots"
          onPlaying={() => { started.current = true; }} onError={() => setRecordingPath(null)} />
      </aside>
    );
  }
  return (
    <aside className={styles.player} data-expanded={expanded} aria-label="Christmas soundtrack">
      <iframe id={frameId} ref={frame} title="Christmas Saves the Year by Twenty One Pilots, official music video"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin" />
      <div className={styles.controls}>
        {control}
        <button id="winter-sound-expand" type="button" className={styles.resize} aria-controls={frameId}
          aria-label={expanded ? "Make player smaller" : "Enlarge player"} title={expanded ? "Make player smaller" : "Enlarge player"}
          aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          {expanded ? <Minimize2 size={14} aria-hidden /> : <Maximize2 size={14} aria-hidden />}
        </button>
      </div>
    </aside>
  );
}
