const originals = new Set(["/images/millstadt-ems/IMG_9307.jpeg", "/images/millstadt-ems/truck1.jpg"]);
export const winterCrewPhoto = "/images/winter/leadership/paramedic-crew.webp";

export function crewPhotoSource(src: string, winter: boolean) {
  if (!winter) return src;
  try {
    const url = new URL(src, "https://www.millstadtems.org");
    if (["www.millstadtems.org", "millstadtems.org"].includes(url.hostname) && originals.has(url.pathname)) return winterCrewPhoto;
  } catch { /* Retain the supplied media URL. */ }
  return src;
}
