export default function SectionDivider({
  variant = "solid",
}: {
  variant?: "solid" | "fadeDown" | "fadeUp";
}) {
  const background =
    variant === "fadeDown"
      ? "linear-gradient(to bottom, #040d1a, #071428)"
      : variant === "fadeUp"
      ? "linear-gradient(to bottom, #071428, #040d1a)"
      : "#040d1a";

  return (
    <div style={{ background, paddingTop: 14, paddingBottom: 14, position: "relative" }}>
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        {/* left rail */}
        <div style={{ position: "relative", flex: "1 1 auto", height: 1 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to right, transparent, rgba(240,180,41,0.30) 65%, rgba(240,180,41,0.55))",
            }}
          />
          <span style={{ position: "absolute", right: 48, top: -3, width: 1, height: 7, background: "rgba(240,180,41,0.6)" }} />
          <span style={{ position: "absolute", right: 96, top: -2, width: 1, height: 5, background: "rgba(240,180,41,0.35)" }} />
          <span style={{ position: "absolute", right: 160, top: -2, width: 1, height: 5, background: "rgba(240,180,41,0.25)" }} />
        </div>

        {/* center ornament */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              display: "block",
              width: 6,
              height: 6,
              borderRadius: 999,
              background: "rgba(240,180,41,0.7)",
              boxShadow: "0 0 10px 2px rgba(240,180,41,0.55)",
            }}
          />
          <span
            style={{
              display: "block",
              width: 12,
              height: 12,
              transform: "rotate(45deg)",
              border: "1px solid rgba(240,180,41,0.8)",
              boxShadow: "0 0 12px rgba(240,180,41,0.45), inset 0 0 6px rgba(240,180,41,0.35)",
            }}
          />
          <span
            style={{
              display: "block",
              width: 6,
              height: 6,
              borderRadius: 999,
              background: "rgba(240,180,41,0.7)",
              boxShadow: "0 0 10px 2px rgba(240,180,41,0.55)",
            }}
          />
        </div>

        {/* right rail */}
        <div style={{ position: "relative", flex: "1 1 auto", height: 1 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to left, transparent, rgba(240,180,41,0.30) 65%, rgba(240,180,41,0.55))",
            }}
          />
          <span style={{ position: "absolute", left: 48, top: -3, width: 1, height: 7, background: "rgba(240,180,41,0.6)" }} />
          <span style={{ position: "absolute", left: 96, top: -2, width: 1, height: 5, background: "rgba(240,180,41,0.35)" }} />
          <span style={{ position: "absolute", left: 160, top: -2, width: 1, height: 5, background: "rgba(240,180,41,0.25)" }} />
        </div>
      </div>
    </div>
  );
}
