import type { Metadata, Viewport } from "next";
import { currentEmployee } from "@/lib/lounge/auth";
import TickerControlClient, {
  TickerControlDenied,
  TickerControlLogin,
} from "./TickerControlClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ticker Control",
  robots: "noindex,nofollow",
  manifest: "/lounge/ticker-control.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ticker Control",
  },
  icons: {
    apple: "/images/millstadt-ems/pwa-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#03101f",
  viewportFit: "cover",
};

export default async function TickerControlPage() {
  const me = await currentEmployee();
  if (!me) return <TickerControlLogin />;
  if (me.username.toLowerCase() !== "kjames") return <TickerControlDenied />;
  return <TickerControlClient firstName={me.firstName} />;
}
