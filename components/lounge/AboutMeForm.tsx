"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface ProfileInitial {
  firstName: string;
  lastName: string;
  certification: string | null;
  position: string | null;
  photoUrl: string | null;
  hireDate: string | null;
  email: string;
  phone: string;
  dob: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  driverLicenseNum: string;
  driverLicenseState: string;
  ecName: string;
  ecRelationship: string;
  ecPhone: string;
  ec2Name: string;
  ec2Relationship: string;
  ec2Phone: string;
  shirtSize: string;
  pantSize: string;
  jacketSize: string;
  allergies: string;
  medicalConditions: string;
  bloodType: string;
  phoneVerifiedAt: string | null;
  profileCompletedAt: string | null;
}

export default function AboutMeForm({ initial }: { initial: ProfileInitial }) {
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const photoCameraRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<null | "ok" | "err">(null);
  const [photoUrl, setPhotoUrl] = useState(initial.photoUrl);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoStatus, setPhotoStatus] = useState<null | { kind: "ok" | "err"; message: string }>(null);

  // Phone verification UI state
  const [phoneVerifiedAt, setPhoneVerifiedAt] = useState<string | null>(initial.phoneVerifiedAt);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyStep, setVerifyStep] = useState<"send" | "code">("send");
  const [verifyCode, setVerifyCodeState] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);
  const [verifyDevCode, setVerifyDevCode] = useState<string | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);

  async function sendCode() {
    if (!form.phone.trim()) { setVerifyStatus("Enter a phone number above first."); return; }
    setVerifyBusy(true);
    setVerifyStatus(null);
    setVerifyDevCode(null);
    try {
      const r = await fetch("/api/lounge/me/phone-verify/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone }),
      });
      const d = await r.json();
      if (!r.ok) { setVerifyStatus(d.error || "Couldn't send code."); return; }
      if (d.via === "fallback" && d.devCode) {
        setVerifyDevCode(d.devCode);
        setVerifyStatus("SMS isn't configured yet — enter the code shown below.");
      } else {
        setVerifyStatus("We just texted you a 6-digit code.");
      }
      setVerifyStep("code");
    } catch {
      setVerifyStatus("Couldn't send code. Try again.");
    } finally { setVerifyBusy(false); }
  }
  async function confirmCode() {
    setVerifyBusy(true);
    setVerifyStatus(null);
    try {
      const r = await fetch("/api/lounge/me/phone-verify/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode }),
      });
      const d = await r.json();
      if (!r.ok) { setVerifyStatus(d.error || "Wrong code."); return; }
      setPhoneVerifiedAt(d.verifiedAt ?? new Date().toISOString());
      setVerifyStatus("Number verified ✅");
      setVerifyStep("send");
      setVerifyCodeState("");
      setVerifyOpen(false);
    } catch {
      setVerifyStatus("Couldn't verify. Try again.");
    } finally { setVerifyBusy(false); }
  }

  // Debounced auto-save. Whenever a tracked field changes we wait ~700ms
  // of quiet and then PUT the profile, no Save button required. Solves
  // the recurring "I typed my birthday and it didn't stick" reports —
  // the field now persists the moment you tab away.
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function autosave() {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => { void save(); }, 700);
  }

  function set<K extends keyof ProfileInitial>(key: K, value: ProfileInitial[K]) {
    setForm((s) => ({ ...s, [key]: value }));
    autosave();
  }

  async function uploadPhoto(file: File) {
    setPhotoBusy(true);
    setPhotoStatus(null);
    try {
      // Don't gate on MIME or filename extension here — Finder's Photos
      // sidebar can hand us a file with no extension AND no MIME, even
      // though the bytes are a real JPEG/HEIC. We trust the picker and
      // let the server validate.
      if (file.size > 8 * 1024 * 1024) {
        setPhotoStatus({ kind: "err", message: "Keep profile photos under 8 MB." });
        return;
      }

      const payload = new FormData();
      payload.append("photo", file);
      const res = await fetch("/api/lounge/me/photo", {
        method: "POST",
        body: payload,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPhotoStatus({ kind: "err", message: data.error || "Photo upload failed." });
        return;
      }
      const nextUrl = data.photoUrl ?? null;
      setPhotoUrl(nextUrl);
      setForm((s) => ({ ...s, photoUrl: nextUrl }));
      setPhotoStatus({ kind: "ok", message: "Profile picture updated." });
      router.refresh();
    } catch {
      setPhotoStatus({ kind: "err", message: "Photo upload failed." });
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    setPhotoBusy(true);
    setPhotoStatus(null);
    try {
      const res = await fetch("/api/lounge/me/photo", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPhotoStatus({ kind: "err", message: data.error || "Could not remove photo." });
        return;
      }
      setPhotoUrl(null);
      setForm((s) => ({ ...s, photoUrl: null }));
      setPhotoStatus({ kind: "ok", message: "Profile picture removed." });
      router.refresh();
    } catch {
      setPhotoStatus({ kind: "err", message: "Could not remove photo." });
    } finally {
      setPhotoBusy(false);
    }
  }

  async function save() {
    setSaving(true);
    setSaved(null);
    try {
      const res = await fetch("/api/lounge/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          phone: form.phone,
          dob: form.dob,
          addressStreet: form.addressStreet,
          addressCity: form.addressCity,
          addressState: form.addressState,
          addressZip: form.addressZip,
          driverLicenseNum: form.driverLicenseNum,
          driverLicenseState: form.driverLicenseState,
          ecName: form.ecName,
          ecRelationship: form.ecRelationship,
          ecPhone: form.ecPhone,
          ec2Name: form.ec2Name,
          ec2Relationship: form.ec2Relationship,
          ec2Phone: form.ec2Phone,
          shirtSize: form.shirtSize,
          pantSize: form.pantSize,
          jacketSize: form.jacketSize,
          allergies: form.allergies,
          medicalConditions: form.medicalConditions,
          bloodType: form.bloodType,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaved("err");
        console.error("[AboutMe save] failed:", data?.error || res.status);
      } else {
        setSaved("ok");
        // Sync our local form state to whatever actually landed in the DB
        // so the user immediately sees the persisted values.
        if (data?.profile) {
          const p = data.profile;
          setForm((s) => ({
            ...s,
            email: p.email ?? "",
            phone: p.phone ?? "",
            dob: p.dob ?? "",
            addressStreet: p.addressStreet ?? "",
            addressCity: p.addressCity ?? "",
            addressState: p.addressState ?? "",
            addressZip: p.addressZip ?? "",
            driverLicenseNum: p.driverLicenseNum ?? "",
            driverLicenseState: p.driverLicenseState ?? "",
            ecName: p.ecName ?? "",
            ecRelationship: p.ecRelationship ?? "",
            ecPhone: p.ecPhone ?? "",
            ec2Name: p.ec2Name ?? "",
            ec2Relationship: p.ec2Relationship ?? "",
            ec2Phone: p.ec2Phone ?? "",
            shirtSize: p.shirtSize ?? "",
            pantSize: p.pantSize ?? "",
            jacketSize: p.jacketSize ?? "",
            allergies: p.allergies ?? "",
            medicalConditions: p.medicalConditions ?? "",
            bloodType: p.bloodType ?? "",
            profileCompletedAt: p.profileCompletedAt ?? s.profileCompletedAt,
          }));
        }
        // Refresh the route so server-rendered initial state on the next
        // mount reflects the save.
        router.refresh();
      }
    } catch (err) {
      console.error("[AboutMe save] threw:", err);
      setSaved("err");
    } finally {
      setSaving(false);
      setTimeout(() => setSaved(null), 3500);
    }
  }

  const initials = `${form.firstName[0] ?? ""}${form.lastName[0] ?? ""}`.toUpperCase() || "ME";

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Card title="Profile picture">
        <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", gap: 18, alignItems: "center" }}>
          <div
            style={{
              width: 92,
              height: 92,
              borderRadius: "50%",
              overflow: "hidden",
              border: "2px solid rgba(240,180,41,0.55)",
              boxShadow: "0 0 26px rgba(56,189,248,0.18)",
              background: "radial-gradient(circle at 35% 20%, rgba(56,189,248,0.32), rgba(240,180,41,0.16) 45%, rgba(4,13,26,0.96) 100%)",
              color: "#f0b429",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 900,
              flexShrink: 0,
            }}
          >
            {photoUrl ? (
              <img src={photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
              initials
            )}
          </div>
          <div>
            <p style={{ color: "#cbd5e1", fontSize: 14, lineHeight: 1.55, margin: "0 0 14px" }}>
              Add a headshot for the Wall, comments, Messenger, and your lounge identity chip.
            </p>
            {/* Library / file picker — accept ANY file so the macOS Photos
                sidebar in Finder (which sometimes presents files with no
                extension) doesn't get filtered out. Server validates. */}
            <input
              ref={photoInputRef}
              type="file"
              style={{ display: "none" }}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0] ?? null;
                event.currentTarget.value = "";
                if (file) void uploadPhoto(file);
              }}
            />
            {/* Camera capture — iPhone / Android browsers open the camera */}
            <input
              ref={photoCameraRef}
              type="file"
              accept="image/*"
              capture="user"
              style={{ display: "none" }}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0] ?? null;
                event.currentTarget.value = "";
                if (file) void uploadPhoto(file);
              }}
            />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                disabled={photoBusy}
                onClick={() => photoCameraRef.current?.click()}
                style={{
                  padding: "10px 16px",
                  background: photoBusy ? "rgba(56,189,248,0.40)" : "#38bdf8",
                  color: "#040d1a",
                  border: 0,
                  borderRadius: 11,
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: photoBusy ? "wait" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                📷 Take photo
              </button>
              <button
                type="button"
                disabled={photoBusy}
                onClick={() => photoInputRef.current?.click()}
                style={{
                  padding: "10px 16px",
                  background: photoBusy ? "rgba(240,180,41,0.45)" : "#f0b429",
                  color: "#040d1a",
                  border: 0,
                  borderRadius: 11,
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: photoBusy ? "wait" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {photoBusy ? "Working..." : photoUrl ? "Change photo" : "Choose photo"}
              </button>
              {photoUrl && (
                <button
                  type="button"
                  disabled={photoBusy}
                  onClick={removePhoto}
                  style={{
                    padding: "10px 16px",
                    background: "rgba(255,255,255,0.04)",
                    color: "#cbd5e1",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 11,
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    cursor: photoBusy ? "wait" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Remove
                </button>
              )}
              {photoStatus && (
                <span style={{ color: photoStatus.kind === "ok" ? "#86efac" : "#fca5a5", fontSize: 13, fontWeight: 700 }}>
                  {photoStatus.message}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      <ReadOnlyCard title="Identity (managed by admin)" rows={[
        ["Name",          `${form.firstName} ${form.lastName}`],
        ["Certification", form.certification ?? "—"],
        ["Position",      form.position ?? "—"],
        ["Hire date",     form.hireDate ?? "—"],
      ]} />

      <Card title="Contact">
        <Grid>
          <Field label="Email"        type="email" value={form.email}  onChange={(v) => set("email", v)} placeholder="you@example.com" />
          <Field label="Mobile phone" type="tel"   value={form.phone}  onChange={(v) => set("phone", v)} placeholder="(618) 555-0100" />
          <Field label="Date of birth" type="date" value={form.dob}    onChange={(v) => set("dob", v)} />
        </Grid>

        <div style={{ marginTop: 14, padding: 14, background: phoneVerifiedAt ? "rgba(34,197,94,0.08)" : "rgba(56,189,248,0.08)", border: `1px solid ${phoneVerifiedAt ? "rgba(34,197,94,0.30)" : "rgba(56,189,248,0.30)"}`, borderRadius: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ color: phoneVerifiedAt ? "#86efac" : "#7dd3fc", fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>
                Phone verification
              </div>
              <div style={{ color: "white", fontSize: 14, marginTop: 4 }}>
                {phoneVerifiedAt
                  ? `Verified ${new Date(phoneVerifiedAt).toLocaleDateString()}`
                  : "Verify your mobile so management can confirm it on file."}
              </div>
            </div>
            {!phoneVerifiedAt && (
              <button
                type="button"
                onClick={() => { setVerifyOpen((v) => !v); setVerifyStep("send"); setVerifyStatus(null); setVerifyDevCode(null); }}
                style={{ padding: "8px 14px", background: "#38bdf8", color: "#040d1a", border: 0, borderRadius: 10, fontSize: 12, fontWeight: 900, letterSpacing: "0.10em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}
              >
                {verifyOpen ? "Close" : "Verify number"}
              </button>
            )}
          </div>

          {verifyOpen && !phoneVerifiedAt && (
            <div style={{ marginTop: 12 }}>
              {verifyStep === "send" ? (
                <button
                  type="button"
                  disabled={verifyBusy || !form.phone.trim()}
                  onClick={sendCode}
                  style={{ padding: "10px 16px", background: form.phone.trim() ? "#f0b429" : "rgba(240,180,41,0.4)", color: "#040d1a", border: 0, borderRadius: 10, fontSize: 12, fontWeight: 900, letterSpacing: "0.10em", textTransform: "uppercase", cursor: form.phone.trim() && !verifyBusy ? "pointer" : "not-allowed", fontFamily: "inherit" }}
                >
                  {verifyBusy ? "Sending…" : "Text me a code"}
                </button>
              ) : (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    inputMode="numeric"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCodeState(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    style={{ width: 160, padding: "10px 12px", background: "#040d1a", border: "1px solid rgba(255,255,255,0.10)", color: "white", borderRadius: 10, fontSize: 18, letterSpacing: "0.35em", textAlign: "center", outline: "none", fontFamily: "inherit" }}
                  />
                  <button
                    type="button"
                    disabled={verifyBusy || verifyCode.length !== 6}
                    onClick={confirmCode}
                    style={{ padding: "10px 16px", background: verifyCode.length === 6 ? "#f0b429" : "rgba(240,180,41,0.4)", color: "#040d1a", border: 0, borderRadius: 10, fontSize: 12, fontWeight: 900, letterSpacing: "0.10em", textTransform: "uppercase", cursor: verifyCode.length === 6 && !verifyBusy ? "pointer" : "not-allowed", fontFamily: "inherit" }}
                  >
                    {verifyBusy ? "Verifying…" : "Verify"}
                  </button>
                  <button type="button" onClick={() => { setVerifyStep("send"); setVerifyCodeState(""); setVerifyStatus(null); setVerifyDevCode(null); }} style={{ background: "transparent", border: 0, color: "#94a3b8", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    ← Re-send
                  </button>
                </div>
              )}
              {verifyStatus && (
                <p style={{ color: verifyStatus.includes("✅") ? "#86efac" : "#cbd5e1", fontSize: 13, marginTop: 10, marginBottom: 0 }}>
                  {verifyStatus}
                </p>
              )}
              {verifyDevCode && (
                <div style={{ marginTop: 10, padding: 10, background: "rgba(240,180,41,0.10)", border: "1px solid rgba(240,180,41,0.30)", borderRadius: 8 }}>
                  <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" }}>Dev fallback code</span>
                  <div style={{ color: "#f0b429", fontSize: 22, fontWeight: 900, letterSpacing: "0.42em", marginTop: 4 }}>{verifyDevCode}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card title="Home address">
        <Grid>
          <Field full label="Street" value={form.addressStreet} onChange={(v) => set("addressStreet", v)} placeholder="123 W Laurel St" />
          <Field      label="City"   value={form.addressCity}   onChange={(v) => set("addressCity", v)} />
          <Field      label="State"  value={form.addressState}  onChange={(v) => set("addressState", v)} placeholder="IL" />
          <Field      label="ZIP"    value={form.addressZip}    onChange={(v) => set("addressZip", v)} />
        </Grid>
      </Card>

      <Card title="Driver's license">
        <Grid>
          <Field label="DL number" value={form.driverLicenseNum}  onChange={(v) => set("driverLicenseNum", v)} />
          <Field label="DL state"  value={form.driverLicenseState} onChange={(v) => set("driverLicenseState", v)} placeholder="IL" />
        </Grid>
      </Card>

      <Card title="Emergency contact (primary)">
        <Grid>
          <Field label="Name"         value={form.ecName}         onChange={(v) => set("ecName", v)} />
          <Field label="Relationship" value={form.ecRelationship} onChange={(v) => set("ecRelationship", v)} placeholder="Spouse, parent…" />
          <Field label="Phone"        type="tel" value={form.ecPhone} onChange={(v) => set("ecPhone", v)} />
        </Grid>
      </Card>

      <Card title="Emergency contact (secondary, optional)">
        <Grid>
          <Field label="Name"         value={form.ec2Name}         onChange={(v) => set("ec2Name", v)} />
          <Field label="Relationship" value={form.ec2Relationship} onChange={(v) => set("ec2Relationship", v)} />
          <Field label="Phone"        type="tel" value={form.ec2Phone} onChange={(v) => set("ec2Phone", v)} />
        </Grid>
      </Card>

      <Card title="Uniform sizes">
        <Grid>
          <Field label="Shirt"  value={form.shirtSize}  onChange={(v) => set("shirtSize", v)} placeholder="M, L, XL…" />
          <Field label="Pants"  value={form.pantSize}   onChange={(v) => set("pantSize", v)} placeholder="32x32" />
          <Field label="Jacket" value={form.jacketSize} onChange={(v) => set("jacketSize", v)} placeholder="L" />
        </Grid>
      </Card>

      <Card title="Medical">
        <Grid>
          <Field label="Blood type" value={form.bloodType} onChange={(v) => set("bloodType", v)} placeholder="O+, A-, AB+…" />
        </Grid>
        <div style={{ height: 12 }} />
        <Field full label="Allergies" value={form.allergies}
          onChange={(v) => set("allergies", v)} placeholder="None, latex, penicillin…" />
        <div style={{ height: 12 }} />
        <Field full multiline label="Conditions providers should know" value={form.medicalConditions}
          onChange={(v) => set("medicalConditions", v)}
          placeholder="Anything an on-scene partner might need to know in an emergency." />
      </Card>

      <div
        style={{
          position: "sticky",
          bottom: 12,
          background: "#040d1a",
          border: "1px solid rgba(240,180,41,0.25)",
          borderRadius: 14,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
          marginTop: 6,
        }}
      >
        <div style={{ color: "#94a3b8", fontSize: "0.86rem" }}>
          {form.profileCompletedAt
            ? `Last updated ${new Date(form.profileCompletedAt).toLocaleDateString()}`
            : "Save your info so management has it on file."}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {saved === "ok" && <span style={{ color: "#34d399", fontSize: "0.86rem", fontWeight: 700 }}>Saved ✓</span>}
          {saved === "err" && <span style={{ color: "#fca5a5", fontSize: "0.86rem", fontWeight: 700 }}>Save failed</span>}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            style={{
              padding: "11px 22px",
              background: saving ? "rgba(240,180,41,0.45)" : "#f0b429",
              color: "#040d1a",
              fontWeight: 900,
              fontSize: 13,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              borderRadius: 12,
              border: 0,
              cursor: saving ? "wait" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: "#071428",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16,
      padding: "20px 22px 22px",
    }}>
      <h2 style={{
        margin: "0 0 14px",
        color: "white",
        fontSize: 15,
        fontWeight: 900,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function ReadOnlyCard({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <section style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px dashed rgba(255,255,255,0.10)",
      borderRadius: 16,
      padding: "16px 22px 18px",
    }}>
      <h2 style={{
        margin: "0 0 10px",
        color: "#94a3b8",
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
      }}>
        {title}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        {rows.map(([label, value]) => (
          <div key={label}>
            <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</div>
            <div style={{ color: "#e2e8f0", fontSize: 15, marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
      {children}
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder, full, multiline, onBlur,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  full?: boolean;
  multiline?: boolean;
  onBlur?: () => void;
}) {
  const sharedStyle: React.CSSProperties = {
    width: "100%",
    background: "#040d1a",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 10,
    color: "white",
    padding: "11px 13px",
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
  };
  return (
    <label style={{ display: "block", gridColumn: full ? "1 / -1" : undefined }}>
      <span style={{ display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          rows={3}
          placeholder={placeholder}
          style={{ ...sharedStyle, resize: "vertical", minHeight: 72 }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          style={sharedStyle}
        />
      )}
    </label>
  );
}
