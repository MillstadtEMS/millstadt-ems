"use client";

import { useEffect } from "react";
import { themeChangeEvent } from "@/lib/seasonal/useWinterTheme";
import {
  isSeasonalThemeId,
  resolveSeasonalTheme,
  type SeasonalThemePublicConfig,
} from "@/lib/seasonal/themes";

export default function SeasonalThemeController({ config }: { config: SeasonalThemePublicConfig }) {
  useEffect(() => {
    let timer: number;
    function applyTheme() {
      const params = new URLSearchParams(window.location.search);
      const previewTheme = params.get("preview") === "ve" ? params.get("season-preview") : null;
      const theme = isSeasonalThemeId(previewTheme)
        ? previewTheme
        : resolveSeasonalTheme(config);
      if (document.documentElement.dataset.memsSeason !== theme) {
        document.documentElement.dataset.memsSeason = theme;
        window.dispatchEvent(new Event(themeChangeEvent));
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(applyTheme, 60_000 - (Date.now() % 60_000));
    }

    applyTheme();
    document.addEventListener("visibilitychange", applyTheme);
    window.addEventListener("pageshow", applyTheme);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", applyTheme);
      window.removeEventListener("pageshow", applyTheme);
    };
  }, [config]);

  return null;
}
