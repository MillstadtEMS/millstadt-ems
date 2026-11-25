import type { Metadata } from "next";
import { chicagoDateTimeKey, getSeasonalThemePublicConfig } from "./themes";

const cards = {
  site: {
    file: "share-millstadt.jpg",
    alt: "Christmas in Millstadt, with the village landmarks and Millstadt EMS ambulances.",
  },
  financial: {
    file: "share-financial-transparency.jpg",
    alt: "Millstadt EMS Financial Transparency, with the agency emblem and Christmas greenery.",
  },
} as const;

export function withWinterShareCard(normal: Metadata, page: keyof typeof cards = "site", now = new Date()): Metadata {
  if (getSeasonalThemePublicConfig(now).initialTheme !== "winter") return normal;
  const localDate = chicagoDateTimeKey(now);
  const seasonYear = Number(localDate.slice(0, 4)) - (localDate.slice(5, 7) === "01" ? 1 : 0);
  const card = cards[page];
  const image = {
    url: `https://www.millstadtems.org/images/winter/${card.file}?season=${seasonYear}&art=3`,
    width: 1200, height: 630, type: "image/jpeg", alt: card.alt,
  };
  // Omitting a shared title and description lets Next inherit the leaf page's
  // final title/description. Preserve explicitly authored social text as well.
  return {
    ...normal,
    openGraph: { type: "website", siteName: "Millstadt Ambulance Service", ...normal.openGraph, images: [image] },
    twitter: { ...normal.twitter, card: "summary_large_image", images: [image] },
  };
}
