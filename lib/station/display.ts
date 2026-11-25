// What the TV can really show. TV browsers report very different CSS sizes for the same panel: a 4K
// set may run at 3840x2160 CSS pixels (1x), at 1920x1080 (2x), or a Fire Stick at 960x540 (2x). The
// station lays itself out in screen-height units so it fills any of them, and uses this to pick the
// sharpest art and draw at the panel's full resolution (and ?station-debug=1 reports it).

export type DisplayTier = "4k" | "1440p" | "1080p" | "720p" | "sd";

export type StationDisplay = {
  /** CSS viewport (the page's own pixels). */
  viewport: { width: number; height: number };
  devicePixelRatio: number;
  /** The whole screen in CSS pixels, and in device pixels (the panel's real resolution, as reported). */
  screen: { width: number; height: number };
  physical: { width: number; height: number };
  /** The largest of the viewport and the screen, in device pixels: what the art should be sharp for. */
  render: { width: number; height: number };
  tier: DisplayTier;
  hdr: boolean;
  /** The station's layout scale against its 1920x1080 design. */
  scale: number;
  /** Device pixels per design pixel: >1.5 asks for the large NWS icons and the @2x art. */
  sharpness: number;
};

function tierFor(width: number, height: number): DisplayTier {
  const long = Math.max(width, height), short = Math.min(width, height);
  if (long >= 3400 || short >= 1900) return "4k";
  if (long >= 2400 || short >= 1300) return "1440p";
  if (long >= 1800 || short >= 1000) return "1080p";
  if (long >= 1200 || short >= 680) return "720p";
  return "sd";
}

function matches(query: string) {
  try { return window.matchMedia(query).matches; } catch { return false; }
}

export function detectDisplay(): StationDisplay {
  const dpr = window.devicePixelRatio || 1;
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const screenCss = { width: window.screen?.width || viewport.width, height: window.screen?.height || viewport.height };
  const physical = { width: Math.round(screenCss.width * dpr), height: Math.round(screenCss.height * dpr) };
  const fromViewport = { width: Math.round(viewport.width * dpr), height: Math.round(viewport.height * dpr) };
  const render = physical.width * physical.height >= fromViewport.width * fromViewport.height ? physical : fromViewport;
  const scale = Math.min(viewport.width / 1920, viewport.height / 1080);
  return {
    viewport,
    devicePixelRatio: dpr,
    screen: screenCss,
    physical,
    render,
    tier: tierFor(render.width, render.height),
    hdr: matches("(dynamic-range: high)") || matches("(video-dynamic-range: high)"),
    scale,
    sharpness: scale * dpr,
  };
}

/** NWS forecast icons come in small, medium and large; a big TV gets the large ones. */
export function nwsIcon(url: string, display: Pick<StationDisplay, "sharpness"> | null): string {
  if (!url) return url;
  try {
    const icon = new URL(url);
    icon.searchParams.set("size", display && display.sharpness > 1.2 ? "large" : "medium");
    return icon.toString();
  } catch {
    return url;
  }
}
