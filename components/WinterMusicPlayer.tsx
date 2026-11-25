"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Bell, BellOff, Maximize2, Minimize2 } from "lucide-react";
import { useWinterTheme } from "@/lib/seasonal/useWinterTheme";
import { useSnowballTimeout } from "@/lib/seasonal/snowballTimeout";
import styles from "./WinterMusicPlayer.module.css";
import WinterFireplaceScenes from "./WinterFireplaceScenes";

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

// The living room's fire is a snowball target. A hit douses it: a burst of steam and a hiss, the
// logs go dark and smoke, and the room dims a little. A few seconds later the embers fizz with
// sparks like a trick candle and the flames catch again, bringing the light back. Santa, while he
// peeks down the chimney (2.45-5.3 s of each 15 s loop of the room video), takes the snowball
// himself ("Ho ho ho!"), and he stays out of the cold fireplace while the fire is out.
const FIRE = { santa: [2.45, 5.3] as const, smolder: 4200, sparkle: 1300, reveal: 700 };
type FireState = "lit" | "out" | "sparkle" | "relight";
const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** A one-off effect sprite in the fireplace's effect layer (room px), removed when it finishes. */
function effect(host: HTMLElement, className: string, [x, y, w, h]: number[], frames: Keyframe[], options: KeyframeAnimationOptions) {
  const el = document.createElement("i");
  el.className = className;
  el.style.cssText = `left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px`;
  host.appendChild(el);
  const done = () => el.remove();
  el.animate(frames, options).finished.then(done, done);
}

/** Steam billows out of the firebox and rises past the stockings. The first, big puffs cover the
 *  opening while the flames go out underneath. */
const BILLOWS = [[26, 55], [58, 55], [42, 46], [42, 28]] as const;
function steam(host: HTMLElement, count: number, cover: boolean) {
  for (let i = 0; i < count; i++) {
    const big = cover && i < BILLOWS.length;
    const w = big ? rand(46, 54) : rand(22, 32), h = w * .75;
    const [x, y] = big ? [BILLOWS[i][0] + rand(-3, 3), BILLOWS[i][1] + rand(-3, 3)] : [42 + rand(-18, 18), rand(34, 60)];
    const dx = (x - 42) * rand(.7, 1.3) + rand(-6, 6), rise = big ? rand(62, 92) : rand(44, 80);
    effect(host, styles.puff, [x - w / 2, y - h / 2, w, h], [
      { transform: "translate(0, 0) scale(.3)", opacity: 1 },
      { transform: `translate(${(dx * .15).toFixed(1)}px, ${(-rise * .04).toFixed(1)}px) scale(1)`, opacity: 1, offset: .12 },
      { transform: `translate(${(dx * .4).toFixed(1)}px, ${(-rise * .25).toFixed(1)}px) scale(1.12)`, opacity: .95, offset: .3 },
      { transform: `translate(${(dx * .8).toFixed(1)}px, ${(-rise * .65).toFixed(1)}px) scale(1.35)`, opacity: .5, offset: .65 },
      { transform: `translate(${dx.toFixed(1)}px, ${(-rise).toFixed(1)}px) scale(1.6)`, opacity: 0 },
    ], { duration: big ? rand(1700, 2100) : rand(1300, 1800), delay: i * 18, easing: "cubic-bezier(.2, .7, .4, 1)", fill: "backwards" });
  }
}

/** A spark on the logs: a crackle in place, or one that fizzes up in an arc and falls away. */
function spark(host: HTMLElement, fly: boolean) {
  const x = rand(18, 66), y = rand(44, 64), s = rand(7, 12);
  if (!fly) {
    effect(host, styles.spark, [x - s / 2, y - s / 2, s, s], [
      { transform: "scale(0) rotate(0deg)", opacity: 1 },
      { transform: "scale(1.3) rotate(25deg)", opacity: 1, offset: .35 },
      { transform: "scale(0) rotate(50deg)", opacity: .6 },
    ], { duration: rand(150, 280), easing: "ease-out" });
    return;
  }
  const vx = rand(-30, 30), up = rand(22, 48), drop = rand(4, 12);
  effect(host, styles.spark, [x - s / 2, y - s / 2, s, s], [0, .2, .4, .6, .8, 1].map(t => ({
    transform: `translate(${(vx * t).toFixed(1)}px, ${(-up * 4 * t * (1 - t) + drop * t * t).toFixed(1)}px) scale(${(1 - t * .65).toFixed(2)})`,
    opacity: t < .7 ? 1 : 1 - (t - .7) / .3,
  })), { duration: rand(520, 800), easing: "linear" });
}

/** The hiss, popping out beside the firebox and held long enough to read. */
function hiss(host: HTMLElement) {
  const word = document.createElement("i");
  word.className = styles.hiss;
  host.appendChild(word);
  const done = () => word.remove();
  word.animate([
    { transform: "rotate(-9deg) scale(.2)", opacity: 0 },
    { transform: "translateY(-4px) rotate(-9deg) scale(1.2)", opacity: 1, offset: .07 },
    { transform: "translateY(-6px) rotate(-9deg) scale(.96)", opacity: 1, offset: .12 },
    { transform: "translateY(-7px) rotate(-9deg) scale(1)", opacity: 1, offset: .16 },
    { transform: "translateY(-11px) rotate(-9deg) scale(1)", opacity: 1, offset: .88 },
    { transform: "translateY(-18px) rotate(-9deg) scale(.97)", opacity: 0 },
  ], { duration: 2000, easing: "ease-out" }).finished.then(done, done);
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
  // Centre the docked buttons on the header's red/green split (straight down the middle),
  // halfway down the band beneath the candy-cane ribbon.
  const controlsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const group = controlsRef.current;
    if (!dock || !group) return;
    let frameId = 0;
    const place = () => {
      frameId = 0;
      const bar = dock.getBoundingClientRect();
      if (!bar.width) return;
      const ribbon = dock.querySelector<HTMLElement>(".mems-weather-ribbon")?.getBoundingClientRect();
      const top = ribbon?.height ? Math.min(bar.height, Math.max(0, ribbon.bottom - bar.top)) : 0;
      const bandY = (top + bar.height - 7) / 2;
      group.style.setProperty("--split-x", `${(bar.width / 2).toFixed(1)}px`);
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

  // The fire as a snowball target (see FIRE above). An invisible target over the firebox catches the
  // site-wide fight's hits (it dispatches mems:snow-hit on it); a time out, enlarging the player, a
  // background tab or reduced motion puts the fire straight back and stands the target down.
  const player = useRef<HTMLElement>(null);
  const fireTarget = useRef<HTMLElement>(null);
  const fireFx = useRef<HTMLElement>(null);
  const hearthOut = useRef<HTMLElement>(null);
  const hearthEmbers = useRef<HTMLElement>(null);
  useEffect(() => {
    const aside = player.current, target = fireTarget.current, fx = fireFx.current;
    const out = hearthOut.current, embers = hearthEmbers.current, video = room.current;
    if (!aside || !target || !fx || !out || !embers || !video) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let state: FireState = "lit";
    let timers: number[] = [];
    let skipFrame = 0;
    const later = (ms: number, run: () => void) => { timers.push(window.setTimeout(run, ms)); };
    const live = () => !timeout && !expanded && !motion.matches && !document.hidden;
    const santaIn = () => !video.paused && video.currentTime >= FIRE.santa[0] - .25 && video.currentTime < FIRE.santa[1] + .2;
    function arm() {
      if (!live()) {
        for (const name of ["data-snow-fighter", "data-snow-santa", "data-snow-role"]) target!.removeAttribute(name);
        return;
      }
      target!.setAttribute("data-snow-role", "target");
      const santa = state === "lit" && santaIn();
      target!.toggleAttribute("data-snow-santa", santa);
      target!.toggleAttribute("data-snow-fighter", !santa);
    }
    function skipSanta() {
      skipFrame = 0;
      if (state === "lit") return;
      if (video!.currentTime >= FIRE.santa[0] && video!.currentTime < FIRE.santa[1]) video!.currentTime = FIRE.santa[1];
      skipFrame = requestAnimationFrame(skipSanta);
    }
    function clear() { timers.forEach(t => window.clearTimeout(t)); timers = []; }
    /** Straight back to the burning fire. */
    function settle() {
      clear();
      cancelAnimationFrame(skipFrame);
      skipFrame = 0;
      out!.getAnimations().forEach(a => a.cancel());
      embers!.getAnimations().forEach(a => a.cancel());
      fx!.replaceChildren();
      delete aside!.dataset.fire;
      state = "lit";
    }
    function douse() {
      const first = state === "lit";
      clear();
      steam(fx!, first || state === "relight" ? 9 : 4, first || state === "relight");
      if (first) hiss(fx!);
      // The dark, put-out hearth comes in under the steam (or snaps back if the flames were catching).
      out!.getAnimations().forEach(a => a.cancel());
      out!.animate([{ opacity: first ? 0 : 1 }, { opacity: 1 }], { duration: 140, delay: first ? 90 : 0, fill: "both" });
      embers!.getAnimations().forEach(a => a.cancel());
      embers!.animate([
        { opacity: 0 }, { opacity: 1, offset: .05 }, { opacity: .65, offset: .22 }, { opacity: .85, offset: .38 },
        { opacity: .45, offset: .68 }, { opacity: .3 },
      ], { duration: FIRE.smolder, delay: 120, fill: "both" });
      aside!.dataset.fire = "out";
      state = "out";
      if (!skipFrame) skipFrame = requestAnimationFrame(skipSanta);
      arm();
      later(FIRE.smolder, sparkle);
    }
    function sparkle() {
      state = "sparkle";
      // Like a trick candle: the embers glow back up and fizz with sparks, faster and faster...
      embers!.getAnimations().forEach(a => a.cancel());
      embers!.animate([{ opacity: .3 }, { opacity: 1 }], { duration: FIRE.sparkle, easing: "ease-in", fill: "both" });
      const start = performance.now();
      const crackle = () => {
        if (state !== "sparkle") return;
        const t = (performance.now() - start) / FIRE.sparkle;
        if (t >= 1) { relight(); return; }
        for (let i = 0, n = 1 + Math.round(t * 2.5); i < n; i++) spark(fx!, Math.random() < .3 + t * .35);
        later(rand(130, 210) * (1 - t * .55), crackle);
      };
      crackle();
    }
    function relight() {
      state = "relight";
      // ...and it catches: the flames rise from the logs (the dark hearth wipes away from the bottom
      // up) and the room's light comes back.
      delete aside!.dataset.fire;
      const wipe: Keyframe[] = [
        { maskPosition: "0 0%", webkitMaskPosition: "0 0%" },
        { maskPosition: "0 62.5%", webkitMaskPosition: "0 62.5%" },
      ];
      for (const el of [out!, embers!]) el.animate(wipe, { duration: FIRE.reveal, easing: "cubic-bezier(.45, 0, .75, 1)", fill: "forwards" });
      for (let i = 0; i < 16; i++) later(i * 34, () => spark(fx!, true));
      later(FIRE.reveal + 80, () => { settle(); arm(); });
    }
    function onHit() {
      if (!live() || target!.hasAttribute("data-snow-santa")) return;
      douse();
    }
    function onChange() {
      if (!live()) settle();
      arm();
    }
    target.addEventListener("mems:snow-hit", onHit);
    video.addEventListener("timeupdate", arm);
    motion.addEventListener("change", onChange);
    document.addEventListener("visibilitychange", onChange);
    arm();
    return () => {
      settle();
      for (const name of ["data-snow-fighter", "data-snow-santa", "data-snow-role"]) target.removeAttribute(name);
      target.removeEventListener("mems:snow-hit", onHit);
      video.removeEventListener("timeupdate", arm);
      motion.removeEventListener("change", onChange);
      document.removeEventListener("visibilitychange", onChange);
    };
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
  return (<>
    <aside ref={player} className={styles.player} data-winter-video="" data-expanded={expanded} data-still={timeout || undefined}
      aria-label="Christmas soundtrack">
      {/* The living room: the music video plays on the little 1990s TV on its stand. The repaint
          covers the old console TV's slot of the looping room video (its fire, tree lights and window
          snow keep moving around it). */}
      <span className={styles.room} aria-hidden="true" data-living-room="">
        <video ref={room} className={styles.roomVideo} src="/images/winter/kit/living-room/living-room.mp4"
          poster="/images/winter/kit/living-room/living-room-still.webp" muted loop playsInline preload="auto"
          disablePictureInPicture disableRemotePlayback tabIndex={-1} />
        <i className={styles.repaint} />
        <i className={styles.lampGlow} />
        <i className={styles.vcrClock} />
        {/* The fire's warm light on the room, the put-out hearth (dark logs, last embers, smoke),
            the steam and sparks, and the invisible snowball target over the firebox. */}
        <i className={styles.fireGlow}><i /></i>
        <i ref={hearthOut} className={styles.hearthOut} />
        <i ref={hearthEmbers} className={styles.hearthEmbers} />
        <span className={styles.smoke}><i /><i /><i /></span>
        <span ref={fireFx} className={styles.fireFx} />
        <i ref={fireTarget} className={styles.fireTarget} />
      </span>
      {/* With the fire out the room dims a little (the TV's glow stays bright). */}
      <i className={styles.roomDim} aria-hidden="true" />
      <iframe id={frameId} ref={frame} title="Christmas Saves the Year by Twenty One Pilots, official music video"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin" />
      {/* The picture tube's glass: a soft reflection and scan lines over the video. */}
      <i className={styles.tvGlass} aria-hidden="true" />
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
    {/* The fridge beside the fireplace, and the scenes that take turns there (the turkey heist). */}
    <WinterFireplaceScenes expanded={expanded} timeout={timeout} />
  </>);
}
