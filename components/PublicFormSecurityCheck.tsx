"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  action: string;
  onTokenChange: (token: string) => void;
  resetKey?: number;
};

export default function PublicFormSecurityCheck({ action, onTokenChange, resetKey = 0 }: Props) {
  const onTokenChangeRef = useRef(onTokenChange);
  const [serverToken, setServerToken] = useState("");
  const [checked, setChecked] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    onTokenChangeRef.current = onTokenChange;
  }, [onTokenChange]);

  const updateToken = useCallback((token: string) => {
    onTokenChangeRef.current(token);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setServerToken("");
    setChecked(false);
    setLoadFailed(false);
    updateToken("");

    fetch(`/api/form-security?action=${encodeURIComponent(action)}`, {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || typeof data.securityCheckToken !== "string") {
          throw new Error("Security check unavailable");
        }
        if (!cancelled) setServerToken(data.securityCheckToken);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [action, resetKey, retryKey, updateToken]);

  return (
    <div
      className="mt-8 rounded-2xl border border-white/10 bg-[#020912]/75 px-4 py-4"
      aria-label="Security check"
    >
      <div className="mb-3">
        <p className="text-sm font-black uppercase tracking-wider text-white">Security check</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          Select the box below to confirm you are a person.
        </p>
      </div>

      <input type="hidden" name="securityCheckToken" value={checked ? serverToken : ""} />

      <label className="flex min-h-16 cursor-pointer items-center gap-4 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 hover:border-[#f0b429]/45">
        <input
          type="checkbox"
          checked={checked}
          disabled={!serverToken}
          onChange={(event) => {
            const nextChecked = event.currentTarget.checked;
            setChecked(nextChecked);
            updateToken(nextChecked ? serverToken : "");
          }}
          className="h-6 w-6 shrink-0 accent-[#f0b429]"
        />
        <span className="text-base font-bold text-white">I’m not a robot</span>
      </label>

      {!serverToken && !loadFailed && (
        <p className="mt-2 text-xs text-slate-400">Preparing the check…</p>
      )}
      {loadFailed && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-sm text-red-300">The check did not load.</p>
          <button
            type="button"
            onClick={() => setRetryKey((value) => value + 1)}
            className="rounded-lg border border-[#f0b429]/50 px-3 py-2 text-xs font-black uppercase tracking-wider text-[#f0b429]"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
