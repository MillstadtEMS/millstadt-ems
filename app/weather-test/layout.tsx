import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { openGraph: null, twitter: null };

export default function WeatherTestLayout({ children }: { children: ReactNode }) {
  return children;
}
