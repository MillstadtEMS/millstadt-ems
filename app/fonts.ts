import localFont from "next/font/local";

export const siteSans = localFont({
  src: "./fonts/inter-latin.woff2",
  display: "swap",
  variable: "--font-inter",
  weight: "100 900",
});

export const serenityScript = localFont({
  src: "./fonts/dancing-script-700-latin.woff2",
  display: "swap",
  weight: "700",
});

export const boardMono = localFont({
  src: [
    { path: "./fonts/ibm-plex-mono-400-latin.woff2", weight: "400" },
    { path: "./fonts/ibm-plex-mono-500-latin.woff2", weight: "500" },
    { path: "./fonts/ibm-plex-mono-600-latin.woff2", weight: "600" },
  ],
  display: "swap",
  variable: "--font-plex-mono",
});

export const loungeDisplay = localFont({
  src: "./fonts/geist-latin.woff2",
  display: "swap",
  variable: "--font-mas-display",
  weight: "100 900",
});

export const loungeMono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  display: "swap",
  variable: "--font-mas-mono",
  weight: "100 900",
});
