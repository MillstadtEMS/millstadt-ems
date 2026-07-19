import type { Metadata } from "next";
import { Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import "./board.css";

const instrumentSans = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-instrument-sans", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Board Portal", template: "%s · Millstadt EMS Board Portal" },
  robots: "noindex,nofollow",
};

export default function BoardRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`board-root ${instrumentSans.variable} ${plexMono.variable}`}>
      {children}
    </div>
  );
}
