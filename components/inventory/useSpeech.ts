"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Shared continuous-speech hook for the inventory dashboards.
 * Wraps the WebKit / Standard SpeechRecognition API. On iOS, where
 * `continuous = true` doesn't work, falls back to single-shot mode.
 *
 * Returns:
 *   - listening: whether the mic is currently on
 *   - supported: whether SpeechRecognition is available in this browser
 *   - toggle: flip listening on/off
 *   - lastHeard: most recent transcript (or status string like "Listening...")
 */
export function useSpeech(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [lastHeard, setLastHeard] = useState("");
  const activeRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);
  const cbRef = useRef(onResult);
  useEffect(() => { cbRef.current = onResult; }, [onResult]);

  const isIOS = useRef(false);

  useEffect(() => {
    isIOS.current = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    const SR = (window as unknown as Record<string, unknown>).SpeechRecognition ||
               (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    setSupported(!!SR);
    if (!SR) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = new (SR as any)();
    r.continuous = !isIOS.current;
    r.interimResults = false;
    r.lang = "en-US";
    r.maxAlternatives = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const t = e.results[i][0]?.transcript?.trim();
          if (t) {
            setLastHeard(t);
            cbRef.current(t);
          }
        }
      }
    };
    r.onend = () => {
      if (activeRef.current) {
        setTimeout(() => {
          if (activeRef.current) {
            try { r.start(); } catch { /* already running or denied */ }
          }
        }, 300);
      } else {
        setListening(false);
      }
    };
    r.onerror = (ev: { error: string }) => {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
        activeRef.current = false;
        setListening(false);
        setLastHeard("Microphone access denied");
      }
      // "no-speech", "aborted", "network" — onend will auto-restart
    };
    recRef.current = r;
  }, []);

  const toggle = useCallback(() => {
    if (!recRef.current) return;
    if (activeRef.current) {
      activeRef.current = false;
      try { recRef.current.stop(); } catch {}
      setListening(false);
      setLastHeard("");
    } else {
      activeRef.current = true;
      setLastHeard("Listening...");
      try {
        recRef.current.start();
        setListening(true);
      } catch {
        try { recRef.current.stop(); } catch {}
        setTimeout(() => {
          try { recRef.current.start(); setListening(true); } catch { activeRef.current = false; setLastHeard("Could not start mic"); }
        }, 200);
      }
    }
  }, []);

  return { listening, supported, toggle, lastHeard };
}
