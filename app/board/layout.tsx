import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "@fontsource-variable/mona-sans/wght.css";
import "./board.css";

const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Board Portal", template: "%s · Millstadt EMS Board Portal" },
  robots: "noindex,nofollow",
};

export default function BoardRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`board-root ${plexMono.variable}`}>
      {children}
    </div>
  );
}
