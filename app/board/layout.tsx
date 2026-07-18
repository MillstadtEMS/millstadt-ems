import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Serif, IBM_Plex_Mono } from "next/font/google";
import "./board.css";

const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex-sans", display: "swap" });
const plexSerif = IBM_Plex_Serif({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-serif", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Board Portal", template: "%s · Millstadt EMS Board Portal" },
  robots: "noindex,nofollow",
};

export default function BoardRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`board-root ${plexSans.variable} ${plexSerif.variable} ${plexMono.variable}`}>
      {children}
    </div>
  );
}
