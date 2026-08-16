"use client";

import { useState } from "react";
import styles from "./PrivacyPage.module.css";

const AREAS = [
  ["north_millstadt", "North Millstadt"],
  ["south_millstadt", "South Millstadt"],
  ["central_millstadt", "Central Millstadt"],
  ["surrounding_communities", "Surrounding communities"],
  ["outside_millstadt_area", "Outside the Millstadt area"],
  ["prefer_not_to_say", "Prefer not to say"],
] as const;

export function ManagePreferencesButton() {
  return (
    <button
      className={styles.manage}
      type="button"
      onClick={() => window.dispatchEvent(new Event("millstadt:open-privacy"))}
    >
      Manage preferences
    </button>
  );
}

export function CommunityAreaSurvey() {
  const [area, setArea] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!area) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/analytics/community-area", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area }),
      });
      const data = (await response.json()) as { error?: string };
      setMessage(response.ok ? "Your unlinked survey response was recorded." : data.error || "Survey response could not be recorded.");
      if (response.ok) setArea("");
    } catch {
      setMessage("Survey response could not be recorded.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.survey} onSubmit={submit}>
      <label htmlFor="community-area">Broad community area</label>
      <select id="community-area" value={area} onChange={(event) => setArea(event.target.value)} required>
        <option value="">Select an area</option>
        {AREAS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <button type="submit" disabled={saving || !area}>{saving ? "Submitting..." : "Submit optional response"}</button>
      {message ? <p className={styles.surveyStatus} role="status">{message}</p> : null}
    </form>
  );
}
