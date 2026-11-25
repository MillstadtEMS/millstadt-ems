"use client";

import { usePathname } from "next/navigation";
import "./winter-workspace.css";
import "./winter-site-colors.css";
import "./winter-snowball-play.css";
import WinterPageSurprises from "./WinterPageSurprises";
import WinterTrinketHunt from "./WinterTrinketHunt";
import WinterRoofline from "./WinterRoofline";
import WinterSnowballAmbush from "./WinterSnowballAmbush";
import WinterStreetParade from "./WinterStreetParade";
import WinterMusicPlayer from "./WinterMusicPlayer";
import WinterSnowballFight from "./WinterSnowballFight";
import WinterTimeoutButton from "./WinterTimeoutButton";
import musicStyles from "./WinterMusicPlayer.module.css";
import { useWinterTheme } from "@/lib/seasonal/useWinterTheme";
import { useDeviceMarker } from "@/lib/device/profile";

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
  useDeviceMarker();
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

  // The station TV (/station) is one hands-free screen that composes its own scene (the lights, the
  // living room, the village, the snowball fight and the drive-by): no ticker, header, footer, Time
  // Out sign, page surprises or trinkets.
  if (pathname === "/station" || pathname.startsWith("/station/")) {
    return <main className="mems-station flex-1 w-full">{children}</main>;
  }

  const ambush = winter && <WinterSnowballAmbush key={pathname} pathname={pathname} />;

  if (standalone) {
    return (
      <main className="mems-standalone flex-1 w-full overflow-x-hidden" style={{ paddingTop: 0 }}>
        {ambush}
        {winter && <WinterRoofline standalone />}
        {/* Staff pages have no candy-cane ribbon, so Time Out docks in the corner instead. */}
        {winter && <WinterTimeoutButton floating />}
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
        {/* The top banner is a cozy living room; the music video plays on its old TV. */}
        <div className={musicStyles.stage}>
          <WinterMusicPlayer />
        </div>
        {children}
      </main>
      <WinterPageSurprises pathname={pathname} />
      <WinterTrinketHunt pathname={pathname} />
      {/* Public pages only: the staff tools (lounge, admin, inventory, truck check, board) stay calm. */}
      {winter && <WinterSnowballFight />}
      {footer}
    </>
  );
}
