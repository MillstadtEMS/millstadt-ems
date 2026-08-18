"use client";

import { useEffect } from "react";
import {
  isSeasonalThemeId,
  resolveSeasonalTheme,
  type SeasonalThemePublicConfig,
} from "@/lib/seasonal/themes";

export default function SeasonalThemeController({ config }: { config: SeasonalThemePublicConfig }) {
  useEffect(() => {
    function applyTheme() {
      const params = new URLSearchParams(window.location.search);
      const previewTheme = params.get("preview") === "ve" ? params.get("season-preview") : null;
      const theme = isSeasonalThemeId(previewTheme)
        ? previewTheme
        : resolveSeasonalTheme(config);
      document.documentElement.dataset.memsSeason = theme;
    }

    applyTheme();
    const timer = window.setInterval(applyTheme, 60_000);
    return () => window.clearInterval(timer);
  }, [config]);

  return null;
}
