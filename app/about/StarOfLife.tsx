/** Six-barred Star of Life with the Rod of Asclepius. Colour comes from `currentColor`. */
export default function StarOfLife({ className, size = 18 }: { className?: string; size?: number }) {
  const bars = [0, 60, 120];
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="-12 -12 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="#ffffff">
        {bars.map((turn) => (
          <rect key={turn} x="-4.1" y="-11.7" width="8.2" height="23.4" rx="1.6" transform={`rotate(${turn})`} />
        ))}
      </g>
      <g fill="currentColor">
        {bars.map((turn) => (
          <rect key={turn} x="-3.1" y="-10.7" width="6.2" height="21.4" rx="1" transform={`rotate(${turn})`} />
        ))}
      </g>
      <path d="M0,-7.6 V7.8" stroke="#ffffff" strokeWidth="1.35" strokeLinecap="round" />
      <path
        d="M-1.9,-4.6 C2.4,-3.9 2.4,-1.7 0,-0.9 C-2.4,-0.1 -2.4,2.2 1.9,3.1 C0.6,4.4 -0.6,4.6 -1.1,5.4"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.05"
        strokeLinecap="round"
      />
      <circle cx="-2.1" cy="-4.7" r="0.95" fill="#ffffff" />
    </svg>
  );
}
