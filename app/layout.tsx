import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#040d1a] text-slate-100 antialiased overflow-x-hidden">
        <Nav />
        <main className="flex-1 w-full overflow-x-hidden" style={{ paddingTop: "96px" }}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
