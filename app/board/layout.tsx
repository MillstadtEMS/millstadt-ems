import type { Metadata } from "next";
import { boardMono } from "../fonts";
import "@fontsource-variable/mona-sans/wght.css";
import "./board.css";

export const metadata: Metadata = {
  title: { default: "Board Portal", template: "%s · Millstadt EMS Board Portal" },
  robots: "noindex,nofollow",
};

export default function BoardRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`board-root ${boardMono.variable}`}>
      {children}
    </div>
  );
}
