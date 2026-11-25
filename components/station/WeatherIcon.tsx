import type { WeatherData } from "@/lib/weather/millstadt";

// The station's weather icons, drawn as vectors so they stay sharp on any TV (the NWS's own icons
// are small photos, murky at night and soft on a 4K panel).

export type WeatherKind = "clear" | "partly" | "mostly" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "mix" | "thunder" | "wind";

/** From Open-Meteo's current weather code, else the NWS forecast icon's first condition. */
export function weatherKind(data: Pick<WeatherData, "current" | "periods">): WeatherKind {
  const code = data.current.wmoCode;
  if (code != null) {
    if (code === 0 || code === 1) return "clear";
    if (code === 2) return "partly";
    if (code === 3) return "cloudy";
    if (code === 45 || code === 48) return "fog";
    if (code >= 51 && code <= 57) return code >= 56 ? "mix" : "drizzle";
    if (code === 66 || code === 67) return "mix";
    if (code >= 61 && code <= 65) return "rain";
    if (code >= 71 && code <= 77) return "snow";
    if (code >= 80 && code <= 82) return "rain";
    if (code === 85 || code === 86) return "snow";
    if (code >= 95) return "thunder";
  }
  const icon = data.periods[0]?.icon ?? "";
  const first = icon.match(/\/(?:day|night)\/([a-z_]+)/)?.[1] ?? "";
  if (/tsra|tornado|hurricane|tropical/.test(first)) return "thunder";
  if (/fzra|sleet|rain_snow/.test(first)) return "mix";
  if (/snow|blizzard/.test(first)) return "snow";
  if (/rain/.test(first)) return "rain";
  if (/fog|haze|smoke|dust/.test(first)) return "fog";
  if (/^wind/.test(first)) return "wind";
  if (/ovc/.test(first)) return "cloudy";
  if (/bkn/.test(first)) return "mostly";
  if (/few|sct/.test(first)) return "partly";
  return "clear";
}

const CLOUD = "M19 50h28.5a10.5 10.5 0 0 0 .9-20.96A15 15 0 0 0 19.6 25.2 12.4 12.4 0 0 0 19 50z";

function Sun({ x = 32, y = 32, r = 11 }: { x?: number; y?: number; r?: number }) {
  return (
    <g>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4, c = Math.cos(a), s = Math.sin(a);
        return <line key={i} x1={x + c * (r + 4)} y1={y + s * (r + 4)} x2={x + c * (r + 9)} y2={y + s * (r + 9)} stroke="#ffcf3f" strokeWidth="3.4" strokeLinecap="round" />;
      })}
      <circle cx={x} cy={y} r={r} fill="#ffd54a" stroke="#e59a12" strokeWidth="2" />
    </g>
  );
}

function Moon({ x = 32, y = 32, r = 12 }: { x?: number; y?: number; r?: number }) {
  return (
    <g>
      <path d={`M${x + r * .35} ${y - r} A${r} ${r} 0 1 0 ${x + r} ${y + r * .45} A${r * .82} ${r * .82} 0 0 1 ${x + r * .35} ${y - r} z`}
        fill="#fff1b8" stroke="#d9b75a" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M50 12l1.2 2.6 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4z" fill="#fff6d0" />
    </g>
  );
}

function Cloud({ shade = "#f4f7fb", dy = 0 }: { shade?: string; dy?: number }) {
  return <path d={CLOUD} transform={dy ? `translate(0 ${dy})` : undefined} fill={shade} stroke="#8fa3bd" strokeWidth="2" strokeLinejoin="round" />;
}

const drops = (color: string, count = 3) => Array.from({ length: count }, (_, i) => (
  <line key={i} x1={23 + i * 9} y1={53} x2={20 + i * 9} y2={60} stroke={color} strokeWidth="3.2" strokeLinecap="round" />
));
const flakes = (count = 3) => Array.from({ length: count }, (_, i) => {
  const x = 22 + i * 10, y = 57;
  return (
    <g key={i} stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round">
      <line x1={x - 3.5} y1={y} x2={x + 3.5} y2={y} /><line x1={x - 1.8} y1={y - 3} x2={x + 1.8} y2={y + 3} /><line x1={x + 1.8} y1={y - 3} x2={x - 1.8} y2={y + 3} />
    </g>
  );
});

export default function WeatherIcon({ kind, night, className }: { kind: WeatherKind; night: boolean; className?: string }) {
  const Sky = night ? Moon : Sun;
  let art: React.ReactNode;
  switch (kind) {
    case "clear": art = night ? <Moon x={30} y={33} r={15} /> : <Sun r={12} />; break;
    case "partly": art = <><g transform="translate(-9 -9)"><Sky /></g><Cloud dy={4} /></>; break;
    case "mostly": art = <><g transform="translate(-11 -12) scale(.85)"><Sky /></g><Cloud shade="#e3e9f1" dy={2} /></>; break;
    case "cloudy": art = <><path d={CLOUD} transform="translate(8 -9) scale(.8)" fill="#c9d3df" stroke="#8fa3bd" strokeWidth="2" /><Cloud shade="#e8edf3" /></>; break;
    case "fog": art = <><Cloud shade="#dfe6ee" dy={-6} />{[48, 54, 60].map((y, i) => <line key={y} x1={12 + i * 3} y1={y} x2={52 - i * 2} y2={y} stroke="#c8d4e2" strokeWidth="3.2" strokeLinecap="round" />)}</>; break;
    case "drizzle": art = <><Cloud dy={-6} />{drops("#7cc4ff", 2)}</>; break;
    case "rain": art = <><Cloud shade="#dfe6ee" dy={-6} />{drops("#5fb0ff", 3)}</>; break;
    case "snow": art = <><Cloud dy={-6} />{flakes(3)}</>; break;
    case "mix": art = <><Cloud shade="#dfe6ee" dy={-6} /><line x1="22" y1="53" x2="19" y2="60" stroke="#5fb0ff" strokeWidth="3.2" strokeLinecap="round" /><g transform="translate(9 0)">{flakes(1)}</g><line x1="42" y1="53" x2="39" y2="60" stroke="#5fb0ff" strokeWidth="3.2" strokeLinecap="round" /></>; break;
    case "thunder": art = <><Cloud shade="#cfd8e3" dy={-6} /><path d="M34 44l-7 11h6l-3 9 10-13h-6l4-7z" fill="#ffd23f" stroke="#c98a00" strokeWidth="1.4" strokeLinejoin="round" /></>; break;
    case "wind": art = <g fill="none" stroke="#e8f1fb" strokeWidth="3.4" strokeLinecap="round"><path d="M10 26h28a6 6 0 1 0-6-6" /><path d="M10 36h38a6 6 0 1 1-6 6" /><path d="M14 46h18" /></g>; break;
  }
  return <svg className={className} viewBox="0 0 64 64" aria-hidden="true" focusable="false">{art}</svg>;
}
