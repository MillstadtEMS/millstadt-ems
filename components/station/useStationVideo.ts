"use client";

import { useEffect, useSyncExternalStore } from "react";

// The living-room TV's music video is the site's own YouTube player (WinterMusicPlayer). The station
// listens to what it reports and asks for the sharpest rendition it offers. YouTube still has the
// last word (it sizes the stream to the little TV in the room), so the debug panel shows both.

const YOUTUBE = "https://www.youtube.com";
const FRAME = "winter-soundtrack";
const best = ["highres", "hd2160", "hd1440", "hd1080", "hd720", "large", "medium", "small", "tiny"];

type VideoState = { playing: string | null; asked: string | null };
let state: VideoState = { playing: null, asked: null };
const listeners = new Set<() => void>();
function update(next: Partial<VideoState>) {
  state = { ...state, ...next };
  listeners.forEach(listener => listener());
}

export function useStationVideo(): VideoState {
  return useSyncExternalStore(
    listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => state,
    () => state,
  );
}

/** Ask the player for its highest rendition once it reports which it has. */
export function useHighestVideoRendition() {
  useEffect(() => {
    const ask = (frame: HTMLIFrameElement, quality: string) => {
      frame.contentWindow?.postMessage(JSON.stringify({ event: "command", func: "setPlaybackQuality", args: [quality], id: FRAME, channel: "widget" }), YOUTUBE);
      update({ asked: quality });
    };
    const receive = (event: MessageEvent) => {
      const frame = document.getElementById(FRAME);
      if (!(frame instanceof HTMLIFrameElement) || event.source !== frame.contentWindow || event.origin !== YOUTUBE || typeof event.data !== "string") return;
      let message: { event?: string; info?: { playbackQuality?: string; availableQualityLevels?: string[] } } | null = null;
      try { message = JSON.parse(event.data); } catch { return; }
      const info = message?.info;
      if (!info) return;
      if (typeof info.playbackQuality === "string" && info.playbackQuality !== state.playing) update({ playing: info.playbackQuality });
      const levels = Array.isArray(info.availableQualityLevels) ? info.availableQualityLevels : null;
      if (levels?.length) {
        const top = best.find(level => levels.includes(level));
        if (top && top !== state.asked) ask(frame, top);
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
}
