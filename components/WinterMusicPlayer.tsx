"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Bell, BellOff, Maximize2, Minimize2 } from "lucide-react";
import { useWinterTheme } from "@/lib/seasonal/useWinterTheme";
import { useSnowballTimeout } from "@/lib/seasonal/snowballTimeout";
import styles from "./WinterMusicPlayer.module.css";

// /movies plays its own trailer, so the soundtrack stays out of its way there.
const excluded = new Set(["admin", "api", "board", "inventory", "lounge", "truckcheck", "ten-eight", "offline", "weather-test", "movies"]);
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

// The TV's buttons live in the header, on the red-and-green split right above the TV.
const noSubscription = () => () => {};
const headerDock = () => document.querySelector<HTMLElement>(".mems-site-nav .mems-nav-bar");
const noDock = () => null;

function wantsSound() {
  try { return window.localStorage.getItem(preferenceKey) !== "off"; } catch { return true; }
}

function send(frame: HTMLIFrameElement | null, payload: object) {
  const target = frame?.contentWindow;
  if (!target) return;
  // Until the YouTube player has loaded, the frame is still a same-origin blank page: wait.
  try { if (target.location.href) return; } catch { /* Cross-origin: the player is there. */ }
  target.postMessage(JSON.stringify({ id: frameId, channel: "widget", ...payload }), youtube);
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
  // One song at a time: it pauses while this tab is in the background or another open tab of the
  // site is playing it, and picks up again here when this tab comes back (unless the visitor
  // paused it themselves).
  const playing = useRef(false);
  const heldByUs = useRef(false);
  const channel = useRef<BroadcastChannel | null>(null);
  // The cozy living room around the TV: its fire, tree lights and window snow loop quietly, and
  // hold still during a time out, in a background tab, with reduced motion, or when enlarged.
  const room = useRef<HTMLVideoElement>(null);
  const timeout = useSnowballTimeout();
  const dock = useSyncExternalStore(noSubscription, headerDock, noDock);
  // Centre the docked buttons on the header's diagonal red/green split (the bar's 113deg
  // gradient, split at 49.15%), halfway down the band beneath the candy-cane ribbon.
  const controlsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const group = controlsRef.current;
    if (!dock || !group) return;
    const theta = (113 * Math.PI) / 180, sin = Math.sin(theta), down = -Math.cos(theta);
    let frameId = 0;
    const place = () => {
      frameId = 0;
      const bar = dock.getBoundingClientRect();
      if (!bar.width) return;
      const ribbon = dock.querySelector<HTMLElement>(".mems-weather-ribbon")?.getBoundingClientRect();
      const top = ribbon?.height ? Math.min(bar.height, Math.max(0, ribbon.bottom - bar.top)) : 0;
      const bandY = (top + bar.height - 7) / 2;
      const box = group.getBoundingClientRect();
      const button = group.querySelector("button")?.getBoundingClientRect();
      const lift = button ? button.top + button.height / 2 - (box.top + box.height / 2) : 0;
      const y = bandY + lift;
      const length = Math.abs(bar.width * sin) + Math.abs(bar.height * Math.cos(theta));
      const x = bar.width / 2 + ((0.4915 - 0.5) * length - (y - bar.height / 2) * down) / sin;
      group.style.setProperty("--split-x", `${x.toFixed(1)}px`);
      group.style.setProperty("--band-y", `${bandY.toFixed(1)}px`);
    };
    const queue = () => { if (!frameId) frameId = requestAnimationFrame(place); };
    place();
    const sizes = new ResizeObserver(queue);
    sizes.observe(dock);
    window.addEventListener("resize", queue, { passive: true });
    return () => { cancelAnimationFrame(frameId); sizes.disconnect(); window.removeEventListener("resize", queue); };
  }, [dock]);
  // Snow falls outdoors only: the snowfall layer starts below the living-room banner.
  useEffect(() => {
    const banner = room.current?.closest("aside")?.parentElement;
    if (!banner) return;
    const root = document.documentElement;
    let frameId = 0;
    const place = () => { frameId = 0; root.style.setProperty("--room-bottom", Math.max(0, banner.getBoundingClientRect().bottom) + "px"); };
    const queue = () => { if (!frameId) frameId = requestAnimationFrame(place); };
    place();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue, { passive: true });
    return () => { cancelAnimationFrame(frameId); window.removeEventListener("scroll", queue); window.removeEventListener("resize", queue); root.style.removeProperty("--room-bottom"); };
  }, []);
  useEffect(() => {
    const video = room.current;
    if (!video) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (timeout || expanded || still.matches || document.hidden) video.pause();
      else void video.play().catch(() => {});
    };
    sync();
    still.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => { still.removeEventListener("change", sync); document.removeEventListener("visibilitychange", sync); };
  }, [timeout, expanded]);

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
    const tabs = "BroadcastChannel" in window ? new BroadcastChannel("mems-winter-sound") : null;
    channel.current = tabs;
    function hold() {
      if (!playing.current) return;
      heldByUs.current = true;
      if (local) local.pause();
      else command(player, "pauseVideo");
    }
    function resume() {
      if (!heldByUs.current || !desired.current || document.hidden) return;
      heldByUs.current = false;
      if (local) void local.play().catch(() => {});
      else if (ready.current) command(player, "playVideo");
    }
    function onVisibility() {
      if (document.hidden) hold();
      else { resume(); tryStart(); }
    }
    tabs?.addEventListener("message", (event) => { if (event.data === "playing") hold(); });
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
      if (typeof state === "number" && (state === 1) !== playing.current) {
        playing.current = state === 1;
        if (state === 1) { heldByUs.current = false; tabs?.postMessage("playing"); }
      }
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
    document.addEventListener("visibilitychange", onVisibility);
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
      playing.current = false;
      heldByUs.current = false;
      tabs?.close();
      channel.current = null;
      window.removeEventListener("message", receive);
      document.removeEventListener("visibilitychange", onVisibility);
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
          onPlaying={() => { started.current = true; playing.current = true; heldByUs.current = false; channel.current?.postMessage("playing"); }}
          onPause={() => { playing.current = false; }} onError={() => setRecordingPath(null)} />
      </aside>
    );
  }
  return (
    <aside className={styles.player} data-winter-video="" data-expanded={expanded} aria-label="Christmas soundtrack">
      {/* The living room: the music video plays on the old TV (its screen is the video's width). */}
      <span className={styles.room} aria-hidden="true">
        <video ref={room} className={styles.roomVideo} src="/images/winter/kit/living-room/living-room.mp4"
          poster="/images/winter/kit/living-room/living-room-still.webp" muted loop playsInline preload="auto"
          disablePictureInPicture disableRemotePlayback tabIndex={-1} />
        <i className={styles.tvScreen} />
      </span>
      <iframe id={frameId} ref={frame} title="Christmas Saves the Year by Twenty One Pilots, official music video"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin" />
      {/* The TV's buttons, each with its word underneath, docked on the header's red-and-green
          split right above the TV. */}
      {(() => {
        const buttons = (
          <div ref={controlsRef} className={styles.controls} data-docked={dock ? "" : undefined}>
            <span className={styles.knob}>{control}<small aria-hidden="true">{enabled ? "Sound on" : "Sound off"}</small></span>
            <span className={styles.knob}>
              <button id="winter-sound-expand" type="button" className={styles.resize} aria-controls={frameId}
                aria-label={expanded ? "Make player smaller" : "Enlarge player"} title={expanded ? "Make player smaller" : "Enlarge player"}
                aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
                {expanded ? <Minimize2 size={16} aria-hidden /> : <Maximize2 size={16} aria-hidden />}
              </button>
              <small aria-hidden="true">{expanded ? "Smaller" : "Enlarge"}</small>
            </span>
          </div>
        );
        return dock ? createPortal(buttons, dock) : buttons;
      })()}
    </aside>
  );
}
