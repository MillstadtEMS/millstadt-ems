"use client";

import { Printer } from "lucide-react";

export default function PrintPageButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print-hide inline-flex min-h-12 items-center gap-2 bg-[#f0b429] px-5 font-black text-[#061121] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <Printer className="h-4 w-4" aria-hidden /> Print guide
    </button>
  );
}
