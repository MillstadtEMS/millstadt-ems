import Link from "next/link";

export default function Submitted() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <div style={{ width: 84, height: 84, borderRadius: 999, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.4)", margin: "0 auto 22px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg viewBox="0 0 24 24" width={44} height={44} fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 style={{ color: "white", fontWeight: 900, fontSize: 28, margin: 0 }}>Submitted</h1>
        <p style={{ color: "#94a3b8", marginTop: 10, fontSize: 15, lineHeight: 1.55 }}>
          Your truck check has been sent to the admin console with the date and time.
        </p>
        <Link
          href="/truckcheck"
          style={{ display: "inline-block", marginTop: 28, padding: "14px 22px", borderRadius: 12, background: "#f0b429", color: "#040d1a", fontWeight: 900, fontSize: 15, textDecoration: "none", letterSpacing: "0.04em" }}
        >
          New Check
        </Link>
      </div>
    </main>
  );
}
