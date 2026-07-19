"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Database,
  FileCheck2,
  FileText,
  Gavel,
  Home,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import BoardLogo from "./BoardLogo";
import BoardPhoto from "./BoardPhoto";
import LogoutButton from "./LogoutButton";
import BoardAppearanceControl from "./BoardAppearanceControl";
import BoardSearchPalette, { type BoardCommandItem } from "./BoardSearchPalette";

interface ShellUser {
  firstName: string;
  lastName: string;
  officerTitle: string | null;
  role: string;
  photoUrl: string | null;
}

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

function isActive(path: string, item: NavItem) {
  if (item.href === "/board") return path === "/board";
  return path === item.href || path.startsWith(`${item.href}/`);
}

function titleFor(path: string): string {
  const parts = path.split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? "board";
  if (last === "board") return "Home";
  if (last === "model-review") return "Model review";
  return last.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function breadcrumbs(path: string) {
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 1) return [{ label: "Home", href: "/board" }];
  const crumbs = [{ label: "Home", href: "/board" }];
  let current = "";
  for (const part of parts.slice(1)) {
    current += `/${part}`;
    crumbs.push({ label: part.replace(/-/g, " "), href: `/board${current}` });
  }
  return crumbs;
}

export default function BoardAppShell({
  user,
  isAdmin,
  showMeetings,
  showReferendum,
  showRequests,
  children,
}: {
  user: ShellUser;
  isAdmin: boolean;
  showMeetings: boolean;
  showReferendum: boolean;
  showRequests: boolean;
  children: React.ReactNode;
}) {
  const path = usePathname() || "/board";
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("board_sidebar_collapsed") === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem("board_sidebar_collapsed", next ? "1" : "0");
      return next;
    });
  }

  useEffect(() => {
    setDrawerOpen(false);
  }, [path]);

  const nav = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      { href: "/board", label: "Home", section: "Primary", icon: Home },
      { href: "/board/meetings", label: "Meetings", section: "Primary", icon: CalendarDays, hidden: !showMeetings },
      { href: "/board/briefings", label: "Board briefings", section: "Primary", icon: FileCheck2, hidden: !showMeetings },
      { href: "/board/proposals", label: "Proposals", section: "Primary", icon: Gavel, hidden: !showMeetings },
      { href: "/board/decisions", label: "Decisions", section: "Primary", icon: ClipboardCheck, hidden: !showMeetings },
      {
        href: "/board/referendum",
        label: "Referendum",
        section: "Primary",
        icon: Database,
        hidden: !showReferendum,
        children: [
          { href: "/board/referendum", label: "Overview" },
          { href: "/board/referendum/detailed", label: "Detailed model" },
          { href: "/board/referendum/levy", label: "Levy calculator" },
          { href: "/board/referendum/forecast", label: "Forecast" },
          { href: "/board/referendum/debt", label: "Debt" },
          { href: "/board/referendum/fleet", label: "Fleet" },
          { href: "/board/referendum/staffing", label: "Staffing" },
        ],
      },
      { href: "/board/documents", label: "Documents", section: "Primary", icon: FileText, hidden: !showMeetings && !showReferendum },
      { href: "/board/archive", label: "Archive", section: "Primary", icon: Archive, hidden: !showMeetings },
      { href: "/board/notifications", label: "Notifications", section: "Primary", icon: Bell },
      { href: "/board/requests", label: "Fire requests", section: "Primary", icon: ShieldCheck, hidden: !showRequests },
      { href: "/board/admin/audit", label: "Audit", section: "Administration", icon: Search, hidden: !isAdmin },
      { href: "/board/admin/users", label: "Users", section: "Administration", icon: Users, hidden: !isAdmin },
      { href: "/board/admin/visibility", label: "Visibility", section: "Administration", icon: ShieldCheck, hidden: !isAdmin },
      { href: "/board/admin/model-review", label: "Model review", section: "Administration", icon: Database, hidden: !isAdmin },
      { href: "/board/admin/appearance", label: "Appearance", section: "Administration", icon: LayoutDashboard, hidden: !isAdmin },
      { href: "/board/admin", label: "Administration", section: "Administration", icon: Settings, hidden: !isAdmin },
    ];
    return items.filter((item) => !item.hidden);
  }, [isAdmin, showMeetings, showReferendum, showRequests]);

  const commandItems = useMemo<BoardCommandItem[]>(() => nav.map((item) => ({
    label: item.label,
    eyebrow: item.label.split(" ")[0] === "Board" ? "Briefings" : item.label.split(" ")[0],
    href: item.href,
    keywords: `${item.section} ${item.children?.map((child) => child.label).join(" ") ?? ""}`,
    adminOnly: item.section === "Administration",
  })), [nav]);

  const visiblePrimary = nav.filter((item) => item.section === "Primary");
  const visibleAdmin = nav.filter((item) => item.section === "Administration");
  const crumbs = breadcrumbs(path);
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  const role = ROLE_LABEL[user.role] ?? user.role.replace(/_/g, " ");

  function NavList({ mobile = false }: { mobile?: boolean }) {
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

  return (
    <div className={collapsed ? "board-shell is-collapsed" : "board-shell"}>
      <aside className="board-side" aria-label="Board portal sidebar">
        <Link href="/board" className="board-side-brand" aria-label="Millstadt EMS Board Portal home">
          <BoardLogo />
        </Link>

        <NavList />

        <div className="board-side-footer">
          <Link href="/board/settings" className="board-profile-shortcut">
            <span className="av" aria-hidden="true">
              {user.photoUrl ? <BoardPhoto src={user.photoUrl} /> : initials}
            </span>
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

            <Link href="/board/notifications" className="board-icon-button" aria-label="Open notifications">
              <Bell size={18} aria-hidden="true" />
              <span className="board-dot" aria-hidden="true" />
            </Link>
            <BoardAppearanceControl compact />

            <details className="board-account">
              <summary>
                <span className="av" aria-hidden="true">
                  {user.photoUrl ? <BoardPhoto src={user.photoUrl} /> : initials}
                </span>
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
            <NavList mobile />
          </aside>
        </div>
      )}

      <nav className="board-bottom-nav" aria-label="Mobile quick navigation">
        <Link className={path === "/board" ? "on" : ""} href="/board"><Home size={18} aria-hidden="true" /><span>Home</span></Link>
        {showMeetings && <Link className={path.startsWith("/board/meetings") ? "on" : ""} href="/board/meetings"><CalendarDays size={18} aria-hidden="true" /><span>Meetings</span></Link>}
        {showRequests && <Link className={path.startsWith("/board/requests") ? "on" : ""} href="/board/requests"><ShieldCheck size={18} aria-hidden="true" /><span>Actions</span></Link>}
        <Link className={path.startsWith("/board/documents") ? "on" : ""} href="/board/documents"><FileText size={18} aria-hidden="true" /><span>Docs</span></Link>
        <button type="button" onClick={() => setDrawerOpen(true)}><Menu size={18} aria-hidden="true" /><span>More</span></button>
      </nav>
    </div>
  );
}
