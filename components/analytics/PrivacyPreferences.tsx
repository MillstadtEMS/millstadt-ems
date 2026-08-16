"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import styles from "./PrivacyPreferences.module.css";

type Category = "aggregate" | "returning_visitor" | "broad_geography";
type PreferenceResponse = {
  optionalAnalyticsEnabled: boolean;
  preference: {
    status: "unknown" | "allowed" | "declined" | "withdrawn";
    categories: Category[];
    decidedAt: string | null;
  };
};

const OPTIONS: Array<{ id: Category; title: string; description: string }> = [
  {
    id: "aggregate",
    title: "Aggregate website analytics",
    description: "Page use, performance, accessibility controls, and broad device categories.",
  },
  {
    id: "returning_visitor",
    title: "Returning-visitor estimates",
    description: "A random first-party browser identifier used only for aggregate return estimates.",
  },
  {
    id: "broad_geography",
    title: "Broad geographic analytics",
    description: "Country, state or region, and coarse municipality information with small-group suppression.",
  },
];

export default function PrivacyPreferences() {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<PreferenceResponse["preference"]["status"]>("unknown");
  const [selected, setSelected] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const show = () => {
      openerRef.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    };
    window.addEventListener("millstadt:open-privacy", show);
    return () => window.removeEventListener("millstadt:open-privacy", show);
  }, []);

  useEffect(() => {
    if (!open) return;
    let active = true;
    fetch("/api/privacy/preferences", { cache: "no-store" })
      .then((response) => response.json() as Promise<PreferenceResponse>)
      .then((data) => {
        if (!active) return;
        setEnabled(Boolean(data.optionalAnalyticsEnabled));
        setStatus(data.preference.status);
        setSelected(data.preference.status === "allowed" ? data.preference.categories : []);
        requestAnimationFrame(() => closeRef.current?.focus());
      })
      .catch(() => {
        if (active) setError("Privacy preferences could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keydown);
      openerRef.current?.focus();
    };
  }, [open]);

  async function save(nextStatus: "allowed" | "declined" | "withdrawn") {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/privacy/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, categories: nextStatus === "allowed" ? selected : [] }),
      });
      const data = (await response.json()) as {
        error?: string;
        preference?: PreferenceResponse["preference"];
      };
      if (!response.ok || !data.preference) throw new Error(data.error || "Preference update failed.");
      setStatus(data.preference.status);
      setSelected(data.preference.categories);
      setMessage(nextStatus === "allowed" ? "Optional analytics preferences saved." : "Optional analytics declined.");
      window.dispatchEvent(
        new CustomEvent("millstadt:privacy-updated", { detail: data.preference }),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Preference update failed.");
    } finally {
      setSaving(false);
    }
  }

  function toggle(category: Category) {
    setSelected((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  }

  if (!open) return null;

  return (
    <div className={styles.backdrop} onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <section
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-preferences-title"
        aria-describedby="privacy-preferences-description"
      >
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Millstadt EMS website</p>
            <h2 className={styles.title} id="privacy-preferences-title">Privacy preferences</h2>
          </div>
          <button ref={closeRef} className={styles.close} type="button" onClick={() => setOpen(false)} aria-label="Close privacy preferences">
            <X aria-hidden size={20} />
          </button>
        </header>
        <div className={styles.body}>
          <p className={styles.intro} id="privacy-preferences-description">
            Essential security, authentication, and document-authorization functions remain active. Optional analytics are used only when enabled below and do not affect access to the website or public Form 990 filings.
          </p>
          {!enabled ? (
            <p className={styles.limited}>
              This website is currently in limited mode. Optional analytics are disabled because production privacy, security, retention, provider, and legal-review configuration is incomplete.
            </p>
          ) : (
            <fieldset className={styles.options} disabled={saving}>
              <legend className="sr-only">Optional analytics categories</legend>
              {OPTIONS.map((option) => (
                <label className={styles.option} key={option.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(option.id)}
                    onChange={() => toggle(option.id)}
                  />
                  <span>
                    <strong>{option.title}</strong>
                    <span>{option.description}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          {message ? <p className={styles.status} role="status">{message}</p> : null}
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <div className={styles.actions}>
            {enabled ? (
              <button
                className={styles.action}
                type="button"
                disabled={saving || !selected.includes("aggregate")}
                onClick={() => save("allowed")}
              >
                Allow optional analytics
              </button>
            ) : null}
            <button
              className={styles.action}
              type="button"
              disabled={saving}
              onClick={() => save(status === "allowed" ? "withdrawn" : "declined")}
            >
              Decline optional analytics
            </button>
            <button className={styles.action} type="button" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          <p className={styles.intro} style={{ marginTop: 18, marginBottom: 0 }}>
            Details are available in the <Link className={styles.privacyLink} href="/privacy" onClick={() => setOpen(false)}>website privacy notice</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
