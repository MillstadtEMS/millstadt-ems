"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

type TurnstileOptions = {
  sitekey: string;
  action: string;
  theme: "dark";
  size: "flexible";
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
  "timeout-callback": () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileOptions) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

type Props = {
  action: string;
  onTokenChange: (token: string) => void;
  resetKey?: number;
};

export default function TurnstileWidget({ action, onTokenChange, resetKey = 0 }: Props) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenChangeRef = useRef(onTokenChange);
  const [token, setToken] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    onTokenChangeRef.current = onTokenChange;
  }, [onTokenChange]);

  const updateToken = useCallback((nextToken: string) => {
    setToken(nextToken);
    onTokenChangeRef.current(nextToken);
  }, []);

  const renderWidget = useCallback(() => {
    if (!siteKey || !containerRef.current || !window.turnstile || widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action,
      theme: "dark",
      size: "flexible",
      callback: updateToken,
      "expired-callback": () => updateToken(""),
      "error-callback": () => updateToken(""),
      "timeout-callback": () => updateToken(""),
    });
  }, [action, siteKey, updateToken]);

  useEffect(() => {
    let retryTimer: number | undefined;
    let cancelled = false;

    const tryRender = () => {
      if (cancelled || widgetIdRef.current) return;
      renderWidget();
      if (!widgetIdRef.current) {
        retryTimer = window.setTimeout(tryRender, 100);
      }
    };

    tryRender();
    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget]);

  useEffect(() => {
    if (!widgetIdRef.current || !window.turnstile) return;
    window.turnstile.reset(widgetIdRef.current);
    updateToken("");
  }, [resetKey, updateToken]);

  return (
    <div
      className="mt-8 rounded-2xl border border-white/10 bg-[#020912]/75 px-4 py-4"
      aria-label="Security check"
    >
      <div className="mb-3">
        <p className="text-sm font-black uppercase tracking-wider text-white">Security check</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          This quick check helps us stop fake form submissions.
        </p>
      </div>

      <input type="hidden" name="turnstileToken" value={token} />

      {siteKey ? (
        <>
          <div ref={containerRef} className="min-h-[65px] w-full overflow-hidden" />
          <Script
            id="cloudflare-turnstile"
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            strategy="afterInteractive"
            onReady={renderWidget}
            onError={() => setLoadFailed(true)}
          />
          {loadFailed && (
            <p className="mt-2 text-sm text-red-300">
              The security check did not load. Refresh the page and try again.
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-red-300">
          The security check is unavailable. Please try again later.
        </p>
      )}
    </div>
  );
}
