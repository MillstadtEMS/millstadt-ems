"use client";

import { EyeOff, Shield } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  initialPrivacyShieldState,
  privacyShieldTransition,
} from "@/lib/financials-hub/privacy-shield-state.mjs";
import styles from "./FinancialsPrivacyShield.module.css";

export const SENSITIVE_CAPTURE_NOTICE =
  "Screenshots and screen recordings are prohibited. This page may contain confidential information.";

export const FOREGROUND_RETURN_NOTICE =
  "Sensitive content was hidden while this page was outside the foreground. Screenshots and screen recordings are prohibited.";

export default function FinancialsPrivacyShield({ active }: { active: boolean }) {
  return active ? <ActivePrivacyShield /> : null;
}

function ActivePrivacyShield() {
  const [shieldState, setShieldState] = useState(initialPrivacyShieldState);
  const { shielded, canDismiss } = shieldState;
  const dismissButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function coverContent() {
      setShieldState((current) => privacyShieldTransition(current, "background"));
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") coverContent();
      else setShieldState((current) => privacyShieldTransition(current, "foreground"));
    }

    function onFocus() {
      setShieldState((current) => privacyShieldTransition(current, "foreground"));
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", coverContent);
    window.addEventListener("blur", coverContent);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", coverContent);
      window.removeEventListener("blur", coverContent);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    if (shielded && canDismiss) dismissButtonRef.current?.focus();
  }, [canDismiss, shielded]);

  return (
    <>
      <aside className={styles.notice} aria-label="Confidentiality notice">
        <p>{SENSITIVE_CAPTURE_NOTICE}</p>
        <button
          type="button"
          onClick={() =>
            setShieldState((current) => privacyShieldTransition(current, "manual"))
          }
        >
          <Shield aria-hidden="true" />
          Activate privacy shield
        </button>
      </aside>

      {shielded && (
        <div className={styles.shield} role="dialog" aria-modal="true" aria-labelledby="privacy-shield-title">
          <div className={styles.shieldPanel}>
            <EyeOff aria-hidden="true" />
            <h2 id="privacy-shield-title">Privacy shield active</h2>
            <p>{FOREGROUND_RETURN_NOTICE}</p>
            {canDismiss && document.visibilityState === "visible" && (
              <button
                ref={dismissButtonRef}
                type="button"
                onClick={() =>
                  setShieldState((current) => privacyShieldTransition(current, "dismiss"))
                }
              >
                Return to sensitive content
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
