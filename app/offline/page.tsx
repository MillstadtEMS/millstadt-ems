import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="min-h-[70vh] bg-[#040d1a] px-5 py-24 text-white">
      <div className="mx-auto max-w-xl text-center">
        <WifiOff aria-hidden="true" className="mx-auto h-12 w-12 text-[#f0b429]" strokeWidth={1.75} />
        <h1 className="mt-6 text-3xl font-black">No Internet Connection</h1>
        <p className="mt-4 text-base leading-relaxed text-slate-300">
          This page was not available in the offline copy. Previously loaded public pages may still open from the site menu.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 items-center justify-center bg-[#f0b429] px-6 py-3 text-sm font-black text-[#040d1a]"
        >
          Return Home
        </Link>
      </div>
    </main>
  );
}
