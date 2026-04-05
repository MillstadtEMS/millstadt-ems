export default function EmptyState() {
  return (
    <div className="flex items-center justify-center py-20">
      {/* Post-it note */}
      <div
        className="relative w-64 h-64 flex flex-col"
        style={{
          background: "linear-gradient(160deg, #fde047 0%, #facc15 100%)",
          boxShadow: "4px 4px 16px rgba(0,0,0,0.5), -1px -1px 6px rgba(0,0,0,0.15)",
          transform: "rotate(-3deg)",
        }}
      >
        {/* Top sticky strip (slightly darker yellow — the adhesive part) */}
        <div className="w-full h-10 shrink-0" style={{ background: "rgba(0,0,0,0.08)" }} />

        {/* Note body */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6 gap-3">
          <svg viewBox="0 0 24 24" className="w-10 h-10 fill-current text-yellow-800/30">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
          </svg>
          <p className="text-yellow-900 font-black text-lg text-center leading-snug">
            Nothing to see here.
          </p>
          <p className="text-yellow-800 text-sm text-center leading-snug">
            Check back at another time!
          </p>
        </div>

        {/* Folded corner */}
        <div
          className="absolute bottom-0 right-0"
          style={{
            width: 0,
            height: 0,
            borderStyle: "solid",
            borderWidth: "0 0 28px 28px",
            borderColor: "transparent transparent rgba(0,0,0,0.18) transparent",
          }}
        />
        <div
          className="absolute bottom-0 right-0"
          style={{
            width: 0,
            height: 0,
            borderStyle: "solid",
            borderWidth: "28px 28px 0 0",
            borderColor: "#a16207 transparent transparent transparent",
            opacity: 0.25,
          }}
        />
      </div>
    </div>
  );
}
