"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Database,
  FileCheck2,
  FileText,
  Home,
  LayoutDashboard,
  Menu,
  Settings,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import BoardLogo from "./BoardLogo";
import LogoutButton from "./LogoutButton";
import BoardAppearanceControl from "./BoardAppearanceControl";
import BoardSearchPalette, { type BoardCommandItem } from "./BoardSearchPalette";
import BoardEmojiAvatar from "./BoardEmojiAvatar";
import WelcomeOverlay from "./WelcomeOverlay";
import SessionTimeoutGuard from "./SessionTimeoutGuard";
import { boardUserEmoji } from "@/lib/board/personalization";

interface ShellUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  officerTitle: string | null;
  role: string;
  photoUrl: string | null;
}

type BoardDeviceMode = "phone" | "tablet" | "desktop";

interface NavItem {
  href: string;
  label: string;
  section: string;
  icon: typeof Home;
  hidden?: boolean;
  children?: Array<{ href: string; label: string }>;
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  submitter: "Board operations",
  ems_president: "EMS president",
  ems_board: "EMS board",
  fire_board: "Fire board",
  audit_reviewer: "Audit reviewer",
};

const PATH_LABEL: Record<string, string> = {
  board: "Home",
  visibility: "Fire access",
  referendum: "Budget",
  detailed: "Detail",
  forecast: "Forecast",
  levy: "Levy",
  "model-review": "Workbook",
};

function isActive(path: string, item: NavItem) {
  if (item.href === "/board") return path === "/board";
  return path === item.href || path.startsWith(`${item.href}/`);
}

function labelForPathPart(part: string): string {
  return PATH_LABEL[part] ?? part.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function titleFor(path: string): string {
  const parts = path.split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? "board";
  return labelForPathPart(last);
}

function breadcrumbs(path: string) {
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 1) return [{ label: "Home", href: "/board" }];
  const crumbs = [{ label: "Home", href: "/board" }];
  let current = "";
  for (const part of parts.slice(1)) {
    current += `/${part}`;
    crumbs.push({ label: labelForPathPart(part), href: `/board${current}` });
  }
  return crumbs;
}

function detectBoardDeviceMode(): BoardDeviceMode {
  const width = window.innerWidth;
  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform;
  const touchPoints = window.navigator.maxTouchPoints ?? 0;
  const isIPad = /iPad/i.test(userAgent) || (platform === "MacIntel" && touchPoints > 1);
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

  if (width < 700) return "phone";
  if (width < 980 || isIPad || coarsePointer) return "tablet";
  return "desktop";
}

function BoardNavList({
  mobile = false,
  visiblePrimary,
  visibleAdmin,
  path,
  collapsed,
}: {
  mobile?: boolean;
  visiblePrimary: NavItem[];
  visibleAdmin: NavItem[];
  path: string;
  collapsed: boolean;
}) {
  return (
    <nav className="board-nav" aria-label={mobile ? "Mobile board navigation" : "Board navigation"}>
      <div className="board-nav-section">
        <span className="board-nav-heading">Board</span>
        {visiblePrimary.map((item) => {
          const Icon = item.icon;
          const active = isActive(path, item);
          return (
            <div key={item.href} className="board-nav-group">
              <Link href={item.href} className={active ? "on" : ""} aria-current={active ? "page" : undefined}>
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
              {item.children && active && !collapsed && (
                <div className="board-subnav-shell">
                  {item.children.map((child) => (
                    <Link key={child.href} href={child.href} className={path === child.href ? "on" : ""}>
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {visibleAdmin.length > 0 && (
        <div className="board-nav-section">
          <span className="board-nav-heading">Admin</span>
          {visibleAdmin.map((item) => {
            const Icon = item.icon;
            const active = isActive(path, item);
            return (
              <Link key={item.href} href={item.href} className={active ? "on" : ""} aria-current={active ? "page" : undefined}>
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}

function BoardTabletNav({
  visiblePrimary,
  visibleAdmin,
  path,
  openMenu,
}: {
  visiblePrimary: NavItem[];
  visibleAdmin: NavItem[];
  path: string;
  openMenu: () => void;
}) {
  const tabletItems = [...visiblePrimary, ...visibleAdmin];
  return (
    <nav className="board-tablet-nav" aria-label="Tablet board navigation">
      {tabletItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(path, item);
        return (
          <Link key={item.href} href={item.href} className={active ? "on" : ""} aria-current={active ? "page" : undefined}>
            <Icon size={17} aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
      <button type="button" onClick={openMenu}>
        <Menu size={17} aria-hidden="true" />
        <span>More</span>
      </button>
    </nav>
  );
}

export default function BoardAppShell({
  user,
  isAdmin,
  canManageFireAccess,
  showMeetings,
  showBriefings,
  showReferendum,
  showRequests,
  children,
}: {
  user: ShellUser;
  isAdmin: boolean;
  canManageFireAccess: boolean;
  showMeetings: boolean;
  showBriefings: boolean;
  showReferendum: boolean;
  showRequests: boolean;
  children: React.ReactNode;
}) {
  const path = usePathname() || "/board";
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deviceMode, setDeviceMode] = useState<BoardDeviceMode>("desktop");
  const showDocuments = showReferendum;
  const personalEmoji = boardUserEmoji(user);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setCollapsed(window.localStorage.getItem("board_sidebar_collapsed") === "1");
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem("board_sidebar_collapsed", next ? "1" : "0");
      return next;
    });
  }

  useEffect(() => {
    const id = window.setTimeout(() => setDrawerOpen(false), 0);
    return () => window.clearTimeout(id);
  }, [path]);

  useEffect(() => {
    let disposed = false;
    const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
    const updateDeviceMode = () => {
      if (!disposed) setDeviceMode(detectBoardDeviceMode());
    };

    const id = window.setTimeout(updateDeviceMode, 0);
    window.addEventListener("resize", updateDeviceMode);
    window.addEventListener("orientationchange", updateDeviceMode);
    if (typeof coarsePointerQuery.addEventListener === "function") {
      coarsePointerQuery.addEventListener("change", updateDeviceMode);
    } else {
      coarsePointerQuery.addListener(updateDeviceMode);
    }

    return () => {
      disposed = true;
      window.clearTimeout(id);
      window.removeEventListener("resize", updateDeviceMode);
      window.removeEventListener("orientationchange", updateDeviceMode);
      if (typeof coarsePointerQuery.removeEventListener === "function") {
        coarsePointerQuery.removeEventListener("change", updateDeviceMode);
      } else {
        coarsePointerQuery.removeListener(updateDeviceMode);
      }
    };
  }, []);

  const nav = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      { href: "/board", label: "Home", section: "Primary", icon: Home },
      { href: "/board/meetings", label: "Meetings", section: "Primary", icon: CalendarDays, hidden: !showMeetings },
      { href: "/board/briefings", label: "Board briefings", section: "Primary", icon: FileCheck2, hidden: !showBriefings },
      {
        href: "/board/referendum",
        label: "Budget",
        section: "Primary",
        icon: Database,
        hidden: !showReferendum,
        children: [
          { href: "/board/referendum", label: "Budget" },
          { href: "/board/referendum/detailed", label: "Detail" },
          { href: "/board/referendum/levy", label: "Levy" },
          { href: "/board/referendum/forecast", label: "Forecast" },
          { href: "/board/referendum/debt", label: "Debt" },
          { href: "/board/referendum/fleet", label: "Fleet" },
          { href: "/board/referendum/staffing", label: "Staffing" },
        ],
      },
      { href: "/board/documents", label: "Documents", section: "Primary", icon: FileText, hidden: !showDocuments },
      { href: "/board/requests", label: "Fire requests", section: "Primary", icon: ShieldCheck, hidden: !showRequests },
      { href: "/board/admin/visibility", label: "Fire access", section: "Administration", icon: ShieldCheck, hidden: !canManageFireAccess },
      { href: "/board/admin/model-review", label: "Workbook", section: "Administration", icon: Database, hidden: !isAdmin },
      { href: "/board/admin/appearance", label: "Appearance", section: "Administration", icon: LayoutDashboard, hidden: !isAdmin },
      { href: "/board/admin", label: "Administration", section: "Administration", icon: Settings, hidden: !isAdmin },
    ];
    return items.filter((item) => !item.hidden);
  }, [canManageFireAccess, isAdmin, showBriefings, showDocuments, showMeetings, showReferendum, showRequests]);

  const commandItems = useMemo<BoardCommandItem[]>(() => nav.map((item) => ({
    label: item.label,
    eyebrow: item.label.split(" ")[0] === "Board" ? "Briefings" : item.label.split(" ")[0],
    href: item.href,
    keywords: `${item.section} ${item.children?.map((child) => child.label).join(" ") ?? ""}`,
    adminOnly: item.section === "Administration" && item.href !== "/board/admin/visibility",
  })), [nav]);

  const visiblePrimary = nav.filter((item) => item.section === "Primary");
  const visibleAdmin = nav.filter((item) => item.section === "Administration");
  const crumbs = breadcrumbs(path);
  const role = ROLE_LABEL[user.role] ?? user.role.replace(/_/g, " ");
  const desktopCollapsed = deviceMode === "desktop" && collapsed;
  const shellClassName = [
    "board-shell",
    `board-device-${deviceMode}`,
    desktopCollapsed ? "is-collapsed" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={shellClassName} data-device-mode={deviceMode}>
      <aside className="board-side" aria-label="Board portal sidebar">
        <Link href="/board" className="board-side-brand" aria-label="Millstadt EMS Board Portal home">
          <BoardLogo />
        </Link>

        <BoardNavList visiblePrimary={visiblePrimary} visibleAdmin={visibleAdmin} path={path} collapsed={desktopCollapsed} />

        <div className="board-side-footer">
          <Link href="/board/settings" className="board-profile-shortcut">
            <BoardEmojiAvatar emoji={personalEmoji} photoUrl={user.photoUrl} role={user.role} />
            <span>
              <strong>{user.firstName} {user.lastName}</strong>
              <small>{role}</small>
            </span>
          </Link>
          <button type="button" className="board-collapse" onClick={toggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <ChevronRight size={18} aria-hidden="true" /> : <ChevronLeft size={18} aria-hidden="true" />}
          </button>
        </div>
      </aside>

      <div className="board-main-shell">
        <header className="board-top">
          <div className="board-top-in">
            <button type="button" className="board-menu-button" onClick={() => setDrawerOpen(true)} aria-label="Open navigation">
              <Menu size={19} aria-hidden="true" />
            </button>
            <div className="board-top-context">
              <div className="board-breadcrumb" aria-label="Breadcrumb">
                {crumbs.map((crumb, index) => (
                  <span key={`${crumb.href}-${index}`}>
                    {index < crumbs.length - 1 ? <Link href={crumb.href}>{crumb.label}</Link> : <span>{crumb.label}</span>}
                  </span>
                ))}
              </div>
              <strong>{titleFor(path)}</strong>
            </div>

            <BoardSearchPalette items={commandItems} isAdmin={isAdmin} />

            <BoardAppearanceControl compact />

            <details className="board-account">
              <summary>
                <BoardEmojiAvatar emoji={personalEmoji} photoUrl={user.photoUrl} role={user.role} />
                <span className="who">
                  <span className="nm">{user.firstName} {user.lastName}</span>
                  <span className="ti">{user.officerTitle ?? role}</span>
                </span>
              </summary>
              <div className="board-account-menu">
                <Link href="/board/settings"><UserRound size={16} aria-hidden="true" /> Account settings</Link>
                <LogoutButton />
              </div>
            </details>
          </div>
        </header>

        <BoardTabletNav visiblePrimary={visiblePrimary} visibleAdmin={visibleAdmin} path={path} openMenu={() => setDrawerOpen(true)} />

        <main className="board-page">{children}</main>
      </div>

      {drawerOpen && (
        <div className="board-drawer-backdrop" role="presentation" onMouseDown={() => setDrawerOpen(false)}>
          <aside className="board-drawer" aria-label="Mobile board navigation" onMouseDown={(event) => event.stopPropagation()}>
            <div className="board-drawer-head">
              <BoardLogo />
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close navigation">
                <X size={19} aria-hidden="true" />
              </button>
            </div>
            <BoardNavList mobile visiblePrimary={visiblePrimary} visibleAdmin={visibleAdmin} path={path} collapsed={false} />
          </aside>
        </div>
      )}

      <nav className="board-bottom-nav" aria-label="Mobile quick navigation">
        <Link className={path === "/board" ? "on" : ""} href="/board"><Home size={18} aria-hidden="true" /><span>Home</span></Link>
        {showMeetings && <Link className={path.startsWith("/board/meetings") ? "on" : ""} href="/board/meetings"><CalendarDays size={18} aria-hidden="true" /><span>Meetings</span></Link>}
        {showRequests && <Link className={path.startsWith("/board/requests") ? "on" : ""} href="/board/requests"><ShieldCheck size={18} aria-hidden="true" /><span>Actions</span></Link>}
        {showDocuments && <Link className={path.startsWith("/board/documents") ? "on" : ""} href="/board/documents"><FileText size={18} aria-hidden="true" /><span>Docs</span></Link>}
        <button type="button" onClick={() => setDrawerOpen(true)}><Menu size={18} aria-hidden="true" /><span>More</span></button>
      </nav>

      <WelcomeOverlay
        firstName={user.firstName}
        title={user.officerTitle}
        photoUrl={user.photoUrl}
        role={user.role}
        emoji={personalEmoji}
      />
      <SessionTimeoutGuard />
    </div>
  );
}
