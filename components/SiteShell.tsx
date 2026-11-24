"use client";

import { usePathname } from "next/navigation";
import "./winter-workspace.css";
import "./winter-site-colors.css";
import WinterPageSurprises from "./WinterPageSurprises";
import WinterRoofline from "./WinterRoofline";
import WinterSnowballAmbush from "./WinterSnowballAmbush";
import WinterStreetParade from "./WinterStreetParade";
import WinterMusicPlayer from "./WinterMusicPlayer";
import musicStyles from "./WinterMusicPlayer.module.css";
import { useWinterTheme } from "@/lib/seasonal/useWinterTheme";

export default function SiteShell({
  header,
  footer,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const winter = useWinterTheme();
  // Routes that render their own full chrome (their own header/sidebar) and
  // must NOT also get the public site header. /admin uses the same LoungeShell
  // as /lounge, so it belongs here too — otherwise the global CAD ticker +
  // weather nav stacks on top of the lounge sidebar and overlaps page content.
  const standalone =
    pathname.startsWith("/truckcheck") ||
    pathname.startsWith("/inventory") ||
    pathname.startsWith("/lounge") ||
    pathname.startsWith("/admin") ||
    (pathname.startsWith("/board") && !(winter && pathname === "/board-minutes"));

  const ambush = winter && <WinterSnowballAmbush key={pathname} pathname={pathname} />;

  if (standalone) {
    return (
      <main className="mems-standalone flex-1 w-full overflow-x-hidden" style={{ paddingTop: 0 }}>
        {ambush}
        {winter && <WinterRoofline standalone />}
        <WinterStreetParade pathname={pathname} compact />
        {children}
      </main>
    );
  }

  return (
    <>
      {ambush}
      {header}
      <main
        className="flex-1 w-full overflow-x-hidden mems-main-pad"
        style={{ paddingTop: "120px" }}
      >
        <div className={musicStyles.stage}>
          <WinterMusicPlayer />
          <WinterStreetParade pathname={pathname} compact={pathname === "/"} />
        </div>
        {children}
      </main>
      <WinterPageSurprises pathname={pathname} />
      {footer}
    </>
  );
}
