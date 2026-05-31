"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  initialPhotoUrl: string | null;
  firstName: string;
  lastName: string;
}

export default function PhotoSelfEditor({ initialPhotoUrl, firstName, lastName }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<null | { kind: "ok" | "err"; text: string }>(null);
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();

  async function upload(file: File) {
    if (file.size > 8 * 1024 * 1024) {
      setStatus({ kind: "err", text: "Keep profile photos under 8 MB." });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const form = new FormData();
      form.append("photo", file);
      const r = await fetch("/api/lounge/me/photo", { method: "POST", body: form });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setStatus({ kind: "err", text: d?.error ?? "Photo upload failed." });
        return;
      }
      setPhotoUrl(d.photoUrl ?? null);
      setStatus({ kind: "ok", text: "Profile picture updated." });
      router.refresh();
    } catch {
      setStatus({ kind: "err", text: "Photo upload failed." });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Remove your profile picture?")) return;
    setBusy(true);
    setStatus(null);
    try {
      const r = await fetch("/api/lounge/me/photo", { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setStatus({ kind: "err", text: d?.error ?? "Could not remove photo." });
        return;
      }
      setPhotoUrl(null);
      setStatus({ kind: "ok", text: "Profile picture removed." });
      router.refresh();
    } catch {
      setStatus({ kind: "err", text: "Could not remove photo." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={card}>
      <header style={{ marginBottom: 14 }}>
        <div style={kicker}>Profile photo</div>
        <h2 style={heading}>Your face on the wall</h2>
        <p style={lede}>
          This photo shows up beside your name in the lounge sidebar, the Wall, comments, and on
          your incident reports. You can change it any time.
        </p>
      </header>

      <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        <div style={avatar}>
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <span style={initialsStyle}>{initials || "—"}</span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} style={primary}>
              {busy ? "Uploading…" : photoUrl ? "Change photo" : "Upload photo"}
            </button>
            <button type="button" onClick={() => cameraRef.current?.click()} disabled={busy} style={ghost}>
              Take a photo
            </button>
            {photoUrl && (
              <button type="button" onClick={remove} disabled={busy} style={destructive}>
                Remove
              </button>
            )}
          </div>
          <p style={hint}>JPG, PNG, or HEIC. Up to 8&nbsp;MB. Square crops look best.</p>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          if (fileRef.current) fileRef.current.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          if (cameraRef.current) cameraRef.current.value = "";
        }}
      />

      {status && (
        <div style={{ marginTop: 12, color: status.kind === "ok" ? "#86efac" : "#fca5a5", fontSize: 13, fontWeight: 700 }}>
          {status.text}
        </div>
      )}
    </section>
  );
}

const card: React.CSSProperties = {
  padding: 20,
  background: "rgba(7,20,40,0.55)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
};
const kicker: React.CSSProperties = {
  color: "#f0b429",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  fontFamily: "var(--font-mas-mono), ui-monospace, monospace",
};
const heading: React.CSSProperties = {
  color: "white",
  fontSize: 22,
  fontWeight: 900,
  letterSpacing: "-0.015em",
  margin: "4px 0 6px",
};
const lede: React.CSSProperties = {
  color: "#cbd5e1",
  fontSize: 13.5,
  lineHeight: 1.55,
  margin: 0,
};
const avatar: React.CSSProperties = {
  width: 96,
  height: 96,
  borderRadius: "50%",
  overflow: "hidden",
  background: "rgba(240,180,41,0.16)",
  border: "1px solid rgba(240,180,41,0.30)",
  color: "#f0b429",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const initialsStyle: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 900,
};
const primary: React.CSSProperties = {
  padding: "10px 16px",
  background: "#f0b429",
  color: "#040d1a",
  border: 0,
  borderRadius: 11,
  fontWeight: 900,
  fontSize: 13,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
};
const ghost: React.CSSProperties = {
  padding: "10px 14px",
  background: "transparent",
  color: "#cbd5e1",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 11,
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
};
const destructive: React.CSSProperties = {
  padding: "10px 14px",
  background: "transparent",
  color: "#fca5a5",
  border: "1px solid rgba(239,68,68,0.30)",
  borderRadius: 11,
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
};
const hint: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 12,
  margin: 0,
};
