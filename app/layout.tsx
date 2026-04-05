import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import WeatherAlertOverlay from "@/components/WeatherAlertOverlay";
import CallTicker from "@/components/cad/CallTicker";
import AmboScroll from "@/components/AmboScroll";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Millstadt Ambulance Service | Advanced Life Support",
    template: "%s | Millstadt Ambulance Service",
  },
  description:
    "Millstadt Ambulance Service provides 24/7 advanced life support and emergency medical services to Millstadt and surrounding areas in Illinois.",
  keywords: ["EMS", "ambulance", "Millstadt", "emergency medical services", "ALS", "Illinois"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Millstadt EMS",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <head>
        <meta name="theme-color" content="#040d1a" />
        <link rel="apple-touch-icon" href="/images/millstadt-ems/logo.png" />
      </head>
      <body className="min-h-full flex flex-col bg-[#040d1a] text-slate-100 antialiased overflow-x-hidden">
        <CallTicker />
        <Nav />
        <WeatherAlertOverlay />
        <main className="flex-1 w-full overflow-x-hidden" style={{ paddingTop: "120px" }}>
          {children}
          <AmboScroll />
        </main>
        <Footer />
      </body>
    </html>
  );
}
