"use client";

import type { ReactNode } from "react";
import { useWinterTheme } from "@/lib/seasonal/useWinterTheme";

/**
 * Picks one of two server-rendered looks. The server snapshot is `initialWinter`,
 * so hydration matches the HTML; later season changes swap the look on the client.
 */
export default function SeasonalMonument({
  initialWinter,
  winter,
  normal,
}: {
  initialWinter: boolean;
  winter: ReactNode;
  normal: ReactNode;
}) {
  return useWinterTheme(initialWinter) ? winter : normal;
}
