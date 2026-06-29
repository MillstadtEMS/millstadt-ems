"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import VersionWatcher from "./VersionWatcher";
import PresenceHeartbeat from "./PresenceHeartbeat";
import { NotificationsToast } from "./NotificationsCenter";
import ViewModeToggle from "./ViewModeToggle";

export interface SidebarMe {
  firstName: string;
  lastName: string;
  certification: string | null;
  photoUrl: string | null;
  isAdmin: boolean;
}

interface NavItem {
  href: string;
  label: string;
  eyebrow?: string;
  icon: LoungeIconName;
  external?: boolean; // routes outside /lounge that need SSO
  adminOnly?: boolean;
}

interface ShellBadges {
  notifications: number;
  messages: number;
  submissions: number;
  applications: number;
  visits: number;
  birthdayRequests: number;
  formRequests: number;
  profileRequests: number;
  birthdays: number;
}

const EMPTY_BADGES: ShellBadges = {
  notifications: 0,
  messages: 0,
  submissions: 0,
  applications: 0,
  visits: 0,
  birthdayRequests: 0,
  formRequests: 0,
  profileRequests: 0,
  birthdays: 0,
};

const NAV: NavItem[] = [
  { href: "/lounge",              label: "The Wall",        icon: "newspaper", eyebrow: "Home" },
  { href: "/lounge/notifications", label: "Notifications",  icon: "bell" },
  { href: "/lounge/messages",     label: "Messages",        icon: "message" },
  { href: "/lounge/acks",         label: "Acknowledgments", icon: "checkCircle" },
  { href: "/lounge/forms",        label: "Forms", icon: "inbox" },
  { href: "/lounge/my-file",      label: "My File",         icon: "folder" },
  { href: "/lounge/certs",        label: "Certifications",  icon: "certificate" },
  { href: "/lounge/about-me",     label: "Profile & Photo", icon: "badge" },
  { href: "/lounge/security",     label: "Sign-in & Devices", icon: "shield" },
  { href: "/lounge/incidents",    label: "Incident Reports", icon: "alert" },
  { href: "/lounge/maintenance",  label: "Maintenance",     icon: "wrench" },
  { href: "/lounge/truckwash",    label: "Truck Wash Log",  icon: "droplet" },
  { href: "/lounge/hospitals",    label: "Hospitals",       icon: "hospital" },
  { href: "/lounge/policies",     label: "Policies & SOPs", icon: "book" },
  { href: "/api/lounge/sso/truckcheck", label: "Truck Check", icon: "ambulance", external: true },
  { href: "/api/lounge/sso/inventory",  label: "Inventory",   icon: "box", external: true },
  { href: "/lounge/games",        label: "Games",           icon: "gamepad" },
  // Admin section — collapsed under "Admin Tools" group in the sidebar.
  { href: "/admin/calls",                 label: "Ticker Editor",         icon: "ticker", adminOnly: true },
  { href: "/admin/employees",             label: "Employee Records",      icon: "users", adminOnly: true },
  { href: "/admin/filing-cabinet",        label: "Filing Cabinet",        icon: "archive", adminOnly: true },
  { href: "/admin/website-config",        label: "Website Configuration", icon: "gear", adminOnly: true },
  { href: "/admin/inventory-editor",       label: "Inventory Editor",      icon: "box", adminOnly: true },
  { href: "/admin/incidents",             label: "Incident Reports",      icon: "alert", adminOnly: true },
  { href: "/admin/truckwash",             label: "Truck Wash Log",        icon: "droplet", adminOnly: true },
  { href: "/admin/hospitals",             label: "Hospitals Directory",   icon: "hospital", adminOnly: true },
  { href: "/admin/hospitals/suggestions", label: "Hospital Suggestions",  icon: "mail", adminOnly: true },
  { href: "/admin/submissions",           label: "Form Submissions",      icon: "inbox", adminOnly: true },
  { href: "/admin/forms",                 label: "Forms & Documentation", icon: "folder", adminOnly: true },
  { href: "/admin/onboarding",            label: "Onboarding",            icon: "checkCircle", adminOnly: true },
  { href: "/admin/volunteers",            label: "Volunteer Hours",       icon: "users", adminOnly: true },
  { href: "/admin/login-analytics",       label: "Login Activity",        icon: "chart", adminOnly: true },
  { href: "/admin/dev-tools",             label: "Dev Tools",             icon: "toolbox", adminOnly: true },
  { href: "/admin/polls",                 label: "Polls & Surveys",       icon: "chart", adminOnly: true },
];

const CREW_NAV_SECTIONS = [
  {
    title: "Home Base",
    hrefs: ["/lounge", "/lounge/notifications", "/lounge/messages"],
  },
  {
    title: "My Desk",
    hrefs: ["/lounge/acks", "/lounge/my-file", "/lounge/certs", "/lounge/about-me", "/lounge/security"],
  },
  {
    title: "Forms & Paperwork",
    hrefs: ["/lounge/forms", "/lounge/incidents", "/lounge/maintenance", "/lounge/truckwash"],
  },
  {
    title: "Station Tools",
    hrefs: ["/lounge/hospitals", "/lounge/policies", "/api/lounge/sso/truckcheck", "/api/lounge/sso/inventory", "/lounge/games"],
  },
];

const ADMIN_NAV_SECTIONS = [
  {
    title: "Command",
    hrefs: ["/admin/submissions", "/admin/forms", "/admin/calls", "/admin/employees"],
  },
  {
    title: "Operations",
    hrefs: ["/admin/incidents", "/admin/truckwash", "/admin/hospitals", "/admin/hospitals/suggestions", "/admin/onboarding", "/admin/volunteers", "/admin/polls"],
  },
  {
    title: "Control Room",
    hrefs: ["/admin/filing-cabinet", "/admin/website-config", "/admin/inventory-editor", "/admin/login-analytics", "/admin/dev-tools"],
  },
];

export default function LoungeShell({
  me,
  children,
}: {
  me: SidebarMe;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname() || "/lounge";
  const router = useRouter();

  // First-login password lockdown: new employees get a default password
  // (`firstInitial + lastName + 3935`) and must replace it before they can
  // use the lounge. /api/lounge/me carries the must_change_password flag
  // straight off the session. We send everyone whose flag is true to
  // /lounge/change-password — except the change-password page itself and
  // the login page, so we don't infinite-loop.
  useEffect(() => {
    if (pathname.startsWith("/lounge/change-password")
        || pathname.startsWith("/lounge/login")) return;
    let cancelled = false;
    fetch("/api/lounge/me", { cache: "no-store" }).then(async (r) => {
      if (!r.ok) return;
      const d = await r.json().catch(() => null);
      if (!cancelled && d?.employee?.mustChangePassword === true) {
        router.replace("/lounge/change-password");
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [pathname, router]);

  // Required-ack lockdown: if there's at least one un-acknowledged required
  // notice, push the user to /lounge/acks until they sign. Admin pages
  // (/admin/*) stay accessible so leadership can post + manage notices
  // without being trapped.
  useEffect(() => {
    if (pathname.startsWith("/lounge/acks") || pathname.startsWith("/lounge/login")
        || pathname.startsWith("/lounge/change-password")
        || pathname.startsWith("/admin")) return;
    let cancelled = false;
    fetch("/api/lounge/me/required-acks").then(async (r) => {
      if (!r.ok) return;
      const d = await r.json().catch(() => null);
      if (!cancelled && d && typeof d.count === "number" && d.count > 0) {
        router.replace("/lounge/acks");
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [pathname, router]);

  // Unread badge counts for Notifications + Messages nav items. Polled
  // every 30 s; visibility change forces an immediate refresh so the
  // badge updates the moment the user comes back to the tab. We sum
  // unread message counts across conversations from the same shape the
  // messenger already uses, so there's no new endpoint to maintain.
  const [badges, setBadges] = useState<ShellBadges>(EMPTY_BADGES);
  const isAdmin = me.isAdmin;
  useEffect(() => {
    let cancelled = false;
    async function getJson<T>(url: string): Promise<T | null> {
      try {
        const r = await fetch(url, { cache: "no-store" });
        if (!r.ok) return null;
        return (await r.json()) as T;
      } catch {
        return null;
      }
    }
    async function refresh() {
      const [nData, mData, bData] = await Promise.all([
        getJson<{ unread?: number }>("/api/lounge/notifications"),
        getJson<{ conversations?: Array<{ unreadCount?: number }> }>("/api/lounge/messages"),
        getJson<{ count?: number; people?: unknown[] }>("/api/lounge/birthdays/today"),
      ]);
      if (cancelled) return;

      let next: ShellBadges = {
        ...EMPTY_BADGES,
        notifications: typeof nData?.unread === "number" ? nData.unread : 0,
        messages: Array.isArray(mData?.conversations)
          ? mData.conversations.reduce((sum, c) => sum + (Number(c.unreadCount) || 0), 0)
          : 0,
        birthdays: typeof bData?.count === "number"
          ? bData.count
          : Array.isArray(bData?.people)
            ? bData.people.length
            : 0,
      };

      if (isAdmin) {
        const [sData, frData, prData] = await Promise.all([
          getJson<SubmissionCategory[] | { categories?: SubmissionCategory[] }>("/api/admin/submissions"),
          getJson<{ requests?: unknown[] }>("/api/admin/form-requests?status=pending"),
          getJson<{ requests?: unknown[] }>("/api/admin/profile-change-requests"),
        ]);
        if (cancelled) return;

        const categories = Array.isArray(sData)
          ? sData
          : !Array.isArray(sData) && Array.isArray(sData?.categories)
            ? sData.categories
            : [];
        next = {
          ...next,
          submissions: categories.reduce((sum, c) => sum + (Number(c.unread) || 0), 0),
          applications: categories.filter((c) => isApplicationSubmission(c.formType)).reduce((sum, c) => sum + (Number(c.unread) || 0), 0),
          visits: categories.filter((c) => isVisitSubmission(c.formType)).reduce((sum, c) => sum + (Number(c.unread) || 0), 0),
          birthdayRequests: categories.filter((c) => isBirthdaySubmission(c.formType)).reduce((sum, c) => sum + (Number(c.unread) || 0), 0),
          formRequests: Array.isArray(frData?.requests) ? frData.requests.length : 0,
          profileRequests: Array.isArray(prData?.requests) ? prData.requests.length : 0,
        };
      }

      setBadges(next);
    }
    refresh();
    const id = setInterval(refresh, 30_000);
    const onVis = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [isAdmin]);

  // Slide the session forward while the user is active. The cookie has a
  // 15-minute TTL; we ping every 5 minutes IF the user has interacted
  // recently (mouse, keyboard, touch) so idle tabs eventually time out
  // but working users stay logged in.
  useEffect(() => {
    let lastActivity = Date.now();
    const bump = () => { lastActivity = Date.now(); };
    const events: (keyof DocumentEventMap)[] = ["mousedown", "keydown", "touchstart", "scroll", "visibilitychange"];
    for (const ev of events) document.addEventListener(ev, bump, { passive: true });
    const id = setInterval(() => {
      // Only beat if the user touched the page in the last 10 minutes.
      if (Date.now() - lastActivity < 10 * 60 * 1000) {
        fetch("/api/lounge/heartbeat", { method: "POST" }).catch(() => {});
      }
    }, 5 * 60 * 1000);
    return () => {
      for (const ev of events) document.removeEventListener(ev, bump);
      clearInterval(id);
    };
  }, []);

  const items = NAV.filter((n) => !n.adminOnly || me.isAdmin);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(900px 500px at 50% -10%, rgba(240,180,41,0.06), transparent 60%), #040d1a",
        color: "white",
      }}
    >
      <style>{`
        @media (max-width: 899px) {
          .lounge-shell-grid { grid-template-columns: 1fr !important; }
          .lounge-sidebar-desktop { display: none !important; }
          .lounge-mobile-bar { display: flex !important; }
        }
        @media (min-width: 900px) {
          .lounge-mobile-bar, .lounge-mobile-drawer { display: none !important; }
        }
      `}</style>

      {/* Mobile top bar (sticky) */}
      <div
        className="lounge-mobile-bar"
        style={{
          display: "none",
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "rgba(2,9,18,0.92)",
          backdropFilter: "saturate(180%) blur(12px)",
          WebkitBackdropFilter: "saturate(180%) blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "12px 16px",
          alignItems: "center",
          gap: 10,
        }}
      >
        <button
          type="button"
          aria-label="Open lounge menu"
          onClick={() => setDrawerOpen(true)}
          style={{
            width: 38,
            height: 38,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(240,180,41,0.10)",
            border: "1px solid rgba(240,180,41,0.24)",
            borderRadius: 12,
            color: "#f0b429",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <LoungeIcon name="menu" size={20} />
        </button>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
          <span style={{ color: "#f0b429", fontSize: 10, fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Virtual Breakroom
          </span>
          <span style={{ fontSize: 14, fontWeight: 800, color: "white" }}>
            {currentPageLabel(pathname)}
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <IdentityChip me={me} compact />
        <SignOutButton compact />
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Lounge menu"
          onClick={() => setDrawerOpen(false)}
          className="lounge-mobile-drawer"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background: "rgba(2,6,12,0.6)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            animation: "lounge-drawer-fade 160ms ease-out",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: "min(82vw, 320px)",
              background: "#071428",
              borderRight: "1px solid rgba(240,180,41,0.25)",
              padding: "18px 14px max(env(safe-area-inset-bottom), 18px)",
              overflowY: "auto",
              animation: "lounge-drawer-in 220ms cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <SidebarBody me={me} items={items} pathname={pathname} mobile badges={badges} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* Two-column shell */}
      <div
        className="lounge-shell-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "260px minmax(0, 1fr)",
          maxWidth: 1480,
          margin: "0 auto",
          minHeight: "100vh",
        }}
      >
        {/* Desktop sidebar */}
        <aside
          className="lounge-sidebar-desktop"
          style={{
            borderRight: "1px solid rgba(255,255,255,0.06)",
            padding: "20px 14px",
            position: "sticky",
            top: 0,
            alignSelf: "start",
            maxHeight: "100vh",
            overflowY: "auto",
          }}
        >
          <SidebarBody me={me} items={items} pathname={pathname} badges={badges} />
        </aside>

        {/* Main content */}
        <main
          className="lounge-shell-main"
          style={{ padding: "22px 22px 80px" }}
        >
          {children}
        </main>
      </div>

      <VersionWatcher />
      <PresenceHeartbeat />
      <NotificationsToast />

      {/* Mobile bottom tab bar — visible only on phones, mirrors iOS pattern */}
      <nav
        className="lounge-bottom-nav"
        aria-label="Lounge sections"
        style={{
          display: "none",
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(2,9,18,0.96)",
          backdropFilter: "saturate(180%) blur(14px)",
          WebkitBackdropFilter: "saturate(180%) blur(14px)",
          borderTop: "1px solid rgba(240,180,41,0.18)",
          paddingBottom: "max(env(safe-area-inset-bottom), 6px)",
          zIndex: 70,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", alignItems: "stretch" }}>
          {BOTTOM_TABS.map((tab) => {
            const active = tab.kind === "more"
              ? false
              : tab.match
                ? tab.match(pathname)
                : pathname === tab.href;
            const sharedStyle: React.CSSProperties = {
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              padding: "8px 6px 9px",
              color: active ? "#f0b429" : "#94a3b8",
              textDecoration: "none",
              background: "transparent",
              border: 0,
              borderTop: `2px solid ${active ? "#f0b429" : "transparent"}`,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.04em",
              cursor: "pointer",
              fontFamily: "inherit",
            };
            // The bottom tab bar doesn't surface every nav row; Notifications
            // lives behind the More drawer, so we route its unread badge to
            // the More tab and the messages count to the Chat tab.
            let bottomBadge = 0;
            if (tab.kind === "link" && tab.href === "/lounge/messages") bottomBadge = badges.messages;
            if (tab.kind === "more") bottomBadge = badges.notifications;
            const iconNode = (
              <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <LoungeIcon name={tab.icon} size={21} />
                {bottomBadge > 0 && (
                  <span
                    aria-label={`${bottomBadge} unread`}
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -8,
                      minWidth: 16,
                      height: 16,
                      padding: "0 5px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 999,
                      background: "#ef4444",
                      color: "white",
                      fontFamily: "var(--font-mas-mono), ui-monospace, monospace",
                      fontSize: 9.5,
                      fontWeight: 700,
                      lineHeight: 1,
                      boxShadow: "0 0 0 2px rgba(2,9,18,0.96)",
                    }}
                  >
                    {bottomBadge > 99 ? "99+" : bottomBadge}
                  </span>
                )}
              </span>
            );
            if (tab.kind === "more") {
              return (
                <button
                  key="more"
                  type="button"
                  aria-label="More lounge sections"
                  onClick={() => setDrawerOpen(true)}
                  style={sharedStyle}
                >
                  {iconNode}
                  <span>{tab.label}</span>
                  {active && <BottomTabIndicator />}
                </button>
              );
            }
            return (
              <Link key={tab.href} href={tab.href} style={sharedStyle}>
                {iconNode}
                <span>{tab.label}</span>
                {active && <BottomTabIndicator />}
              </Link>
            );
          })}
        </div>
      </nav>

      <style>{`
        @keyframes lounge-drawer-in {
          0%   { transform: translateX(-32px); opacity: 0; }
          100% { transform: translateX(0);     opacity: 1; }
        }
        @keyframes lounge-drawer-fade {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        @media (max-width: 899px) {
          .lounge-bottom-nav { display: block !important; }
          .lounge-shell-main { padding: 16px 14px 100px !important; }
        }
      `}</style>
    </div>
  );
}

// Top 5 destinations for the bottom tab bar. "More" surfaces the rest
// of the sidebar inside the drawer.
type BottomTab =
  | { kind: "link"; href: string; label: string; icon: LoungeIconName; match?: (path: string) => boolean }
  | { kind: "more"; href: string; label: string; icon: LoungeIconName };
const BOTTOM_TABS: BottomTab[] = [
  { kind: "link", href: "/lounge",            label: "Wall",      icon: "newspaper", match: (p) => p === "/lounge" || p === "/lounge/" },
  { kind: "link", href: "/lounge/messages",   label: "Chat",      icon: "message", match: (p) => p.startsWith("/lounge/messages") },
  { kind: "link", href: "/lounge/acks",       label: "Acks",      icon: "checkCircle", match: (p) => p === "/lounge/acks" || p.startsWith("/lounge/acks/") },
  { kind: "link", href: "/lounge/my-file",    label: "My File",   icon: "folder", match: (p) => p.startsWith("/lounge/my-file") || p.startsWith("/lounge/certs") || p.startsWith("/lounge/about-me") },
  { kind: "more", href: "#more",              label: "More",      icon: "menu" },
];

function BottomTabIndicator() {
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        left: "24%",
        right: "24%",
        bottom: 1,
        height: 3,
        borderRadius: 999,
        background: "#f0b429",
        boxShadow: "0 0 16px rgba(240,180,41,0.46)",
      }}
    />
  );
}

function SidebarBody({
  me, items, pathname, onNavigate, mobile = false, badges,
}: {
  me: SidebarMe;
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  /** True only when this sidebar instance is the phone drawer. The
   *  "View desktop site" toggle is only meaningful on small screens, so
   *  we hide it on the persistent desktop sidebar. */
  mobile?: boolean;
  /** Unread counts pulled by the shell — Notifications + Messages rows
   *  render a red Facebook-style pill when their count is > 0. */
  badges?: ShellBadges;
}) {
  const crewItems = items.filter((n) => !n.adminOnly);
  const adminItems = items.filter((n) => n.adminOnly);
  // Admin work now lives in its OWN area: on any /admin route the sidebar
  // shows ONLY the admin sections (+ a "Back to Lounge" button); on the
  // lounge it shows ONLY crew sections (+ an "Admin Console" button for
  // admins). This keeps the two contexts from piling up into one long,
  // confusing list.
  const adminMode = me.isAdmin && pathname.startsWith("/admin");

  return (
    <>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        marginBottom: 14,
        padding: "11px 10px 13px",
        background: "linear-gradient(180deg, rgba(240,180,41,0.06) 0%, transparent 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 14,
      }}>
        <div style={{ filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.45)) drop-shadow(0 0 18px rgba(60,120,255,0.20))" }}>
          <Image src="/images/millstadt-ems/crest.png" alt="" width={62} height={62} style={{ display: "block", objectFit: "contain" }} />
        </div>
        <div style={{ lineHeight: 1.1, textAlign: "center" }}>
          <div className="mas-mono" style={{ color: "#f0b429", fontSize: 10, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase" }}>
            {adminMode ? "Admin Console" : "Employee Lounge"}
          </div>
          <div className="mas-display" style={{ color: "white", fontWeight: 700, fontSize: 17, marginTop: 5, letterSpacing: "-0.015em" }}>{adminMode ? "Command Center" : "Virtual Breakroom"}</div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <IdentityChip me={me} />
        <SignOutButton />
      </div>

      {mobile && <ViewModeToggle />}

      {/* Switch between the lounge and the dedicated admin console (admins
          only) — the one button that crosses between the two areas. */}
      {me.isAdmin && <ModeSwitchButton adminMode={adminMode} onNavigate={onNavigate} />}

      {/* Crew "alerts" mini-card for non-admins; admins use the wall Ops Inbox. */}
      {!me.isAdmin && <SidebarPulse isAdmin={me.isAdmin} badges={badges ?? EMPTY_BADGES} onNavigate={onNavigate} />}

      <nav style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 9 }}>
        {(adminMode ? ADMIN_NAV_SECTIONS : CREW_NAV_SECTIONS).map((section) => {
          const sectionItems = pickNavItems(adminMode ? adminItems : crewItems, section.hrefs);
          if (sectionItems.length === 0) return null;
          return (
            <NavSection
              key={section.title}
              title={section.title}
              items={sectionItems}
              pathname={pathname}
              onNavigate={onNavigate}
              badges={badges}
            />
          );
        })}
      </nav>

    </>
  );
}

/** The single button that crosses between the lounge and the admin console.
 * In the lounge it opens the admin area; in the admin area it returns. */
function ModeSwitchButton({ adminMode, onNavigate }: { adminMode: boolean; onNavigate?: () => void }) {
  const href = adminMode ? "/lounge" : "/admin";
  const label = adminMode ? "Back to Lounge" : "Admin Console";
  return (
    <Link
      href={href}
      onClick={onNavigate}
      style={{
        display: "flex", alignItems: "center", gap: 8, marginTop: 12,
        padding: "10px 12px", borderRadius: 10,
        background: adminMode ? "rgba(148,163,184,0.10)" : "rgba(240,180,41,0.12)",
        border: `1px solid ${adminMode ? "rgba(148,163,184,0.28)" : "rgba(240,180,41,0.34)"}`,
        color: adminMode ? "#cbd5e1" : "#f0b429",
        fontWeight: 700, fontSize: 12.5, letterSpacing: "0.04em",
        textDecoration: "none", textTransform: "uppercase",
        fontFamily: "var(--font-mas-mono), ui-monospace, monospace",
      }}
    >
      <span style={{ fontSize: 14, lineHeight: 1 }}>{adminMode ? "←" : "⚙"}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {!adminMode && <span style={{ fontSize: 14, lineHeight: 1 }}>→</span>}
    </Link>
  );
}

function pickNavItems(items: NavItem[], hrefs: string[]): NavItem[] {
  return hrefs
    .map((href) => items.find((item) => item.href === href))
    .filter((item): item is NavItem => Boolean(item));
}

function SidebarPulse({
  isAdmin,
  badges,
  onNavigate,
}: {
  isAdmin: boolean;
  badges: ShellBadges;
  onNavigate?: () => void;
}) {
  const adminItems = [
    { label: "New submissions", value: badges.submissions, href: "/admin/submissions", tone: "gold" as const },
    { label: "Applications", value: badges.applications, href: "/admin/submissions?type=Employment%20Application", tone: "green" as const },
    { label: "Visit requests", value: badges.visits, href: "/admin/submissions", tone: "cyan" as const },
    { label: "Birthday requests", value: badges.birthdayRequests, href: "/admin/submissions", tone: "pink" as const },
    { label: "Form approvals", value: badges.formRequests, href: "/admin/forms", tone: "gold" as const },
    { label: "Profile edits", value: badges.profileRequests, href: "/admin/employees", tone: "cyan" as const },
    { label: "Birthdays today", value: badges.birthdays, href: "/lounge", tone: "green" as const },
  ];

  const crewItems = [
    { label: "Today", value: badges.birthdays, href: "/lounge", tone: "green" as const },
    { label: "Notifications", value: badges.notifications, href: "/lounge/notifications", tone: "gold" as const },
    { label: "Messages", value: badges.messages, href: "/lounge/messages", tone: "cyan" as const },
  ].filter((item) => item.value > 0);

  const items = isAdmin ? adminItems : crewItems;
  if (!isAdmin && items.length === 0) return null;

  const hasAction = items.some((item) => item.value > 0);
  const pulseTotal = isAdmin
    ? badges.submissions + badges.formRequests + badges.profileRequests + badges.birthdays
    : items.reduce((sum, item) => sum + item.value, 0);

  return (
    <section
      aria-label={isAdmin ? "Operations inbox" : "Lounge alerts"}
      style={{
        marginTop: 14,
        padding: 12,
        borderRadius: 16,
        background:
          "linear-gradient(145deg, rgba(12,35,64,0.82), rgba(2,9,18,0.92))",
        border: `1px solid ${hasAction ? "rgba(240,180,41,0.22)" : "rgba(255,255,255,0.07)"}`,
        boxShadow: hasAction
          ? "0 14px 34px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.05)"
          : "inset 0 1px 0 rgba(255,255,255,0.04)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: "0 auto 0 0",
          width: 3,
          background: hasAction
            ? "linear-gradient(180deg, #f0b429, #7dd3fc)"
            : "rgba(148,163,184,0.22)",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 9 }}>
        <div>
          <div className="mas-mono" style={{ color: "#f0b429", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            {isAdmin ? "Ops Inbox" : "Heads Up"}
          </div>
          <div className="mas-display" style={{ color: "white", fontSize: 14, fontWeight: 700, marginTop: 2 }}>
            {hasAction ? "Needs eyes" : "All quiet"}
          </div>
        </div>
        <span
          className="mas-numeric"
          style={{
            minWidth: 36,
            height: 32,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            background: hasAction ? "rgba(240,180,41,0.16)" : "rgba(148,163,184,0.10)",
            border: hasAction ? "1px solid rgba(240,180,41,0.35)" : "1px solid rgba(148,163,184,0.16)",
            color: hasAction ? "#f0b429" : "#94a3b8",
            fontSize: 15,
            fontWeight: 800,
          }}
        >
          {pulseTotal}
        </span>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        {items.map((item) => (
          <PulseLink key={`${item.label}-${item.href}`} {...item} onNavigate={onNavigate} />
        ))}
      </div>
    </section>
  );
}

function PulseLink({
  label,
  value,
  href,
  tone,
  onNavigate,
}: {
  label: string;
  value: number;
  href: string;
  tone: "gold" | "green" | "cyan" | "pink";
  onNavigate?: () => void;
}) {
  const color = tone === "green" ? "#34d399" : tone === "cyan" ? "#7dd3fc" : tone === "pink" ? "#f9a8d4" : "#f0b429";
  const active = value > 0;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        gap: 10,
        minHeight: 34,
        padding: "7px 9px",
        borderRadius: 10,
        textDecoration: "none",
        background: active ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.025)",
        border: active ? `1px solid ${hexToRgba(color, 0.34)}` : "1px solid rgba(255,255,255,0.055)",
        color: active ? "white" : "#94a3b8",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span
          aria-hidden
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: active ? color : "rgba(148,163,184,0.36)",
            boxShadow: active ? `0 0 14px ${hexToRgba(color, 0.68)}` : "none",
            flexShrink: 0,
          }}
        />
        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12.5, fontWeight: 700 }}>
          {label}
        </span>
      </span>
      <span
        className="mas-numeric"
        style={{
          minWidth: 24,
          height: 22,
          padding: "0 7px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 999,
          background: active ? hexToRgba(color, 0.15) : "rgba(148,163,184,0.08)",
          color: active ? color : "#64748b",
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        {value > 99 ? "99+" : value}
      </span>
    </Link>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function NavSection({
  title, items, pathname, onNavigate, badges,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  badges?: ShellBadges;
}) {
  const containsActive = items.some((i) => isActive(pathname, i));
  // Sections that contain the current page start expanded so the user
  // can navigate between siblings (e.g., between Home Base tabs)
  // without the menu collapsing on every click. Sections that don't
  // contain the active route stay tucked away until the user opens
  // them. On any navigation OUT of a category, that category collapses
  // automatically because `containsActive` flips false at the new
  // pathname.
  const [open, setOpen] = useState<boolean>(containsActive);

  // Re-sync the open state when the route changes — if the user
  // navigates from one section into another, the previously-open
  // section should close on its own rather than stay pinned by an
  // earlier setState. Manual toggles still work because the user
  // click happens AFTER the effect's initial sync for any given
  // pathname.
  useEffect(() => {
    setOpen(containsActive);
  }, [containsActive]);

  function toggle() {
    setOpen((cur) => !cur);
  }

  // Aggregate unread badge for the whole section so a collapsed section
  // still shows the unread crew dot.
  const sectionBadge = items.reduce((sum, i) => sum + badgeForItem(i, badges), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        style={{
          ...navSection,
          width: "100%",
          background: containsActive && !open ? "rgba(240,180,41,0.06)" : "transparent",
          border: containsActive && !open ? "1px solid rgba(240,180,41,0.16)" : "1px solid transparent",
          borderRadius: 10,
          textAlign: "left",
          cursor: "pointer",
          fontFamily: "var(--font-mas-mono), ui-monospace, monospace",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ display: "inline-block", width: 10, color: "#f0b429", transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>▸</span>
        <span style={{ flex: 1 }}>{title}</span>
        {!open && sectionBadge > 0 && (
          <span style={{ background: "#ef4444", color: "white", fontSize: 9, fontWeight: 900, padding: "1px 6px", borderRadius: 999, minWidth: 16, textAlign: "center" }}>
            {sectionBadge}
          </span>
        )}
      </button>
      {open && items.map((item) => (
        <Fragment key={item.href}>
          <NavRow
            item={item}
            active={isActive(pathname, item)}
            onNavigate={onNavigate}
            badge={badgeForItem(item, badges)}
          />
          {item.href === "/admin/submissions" && (
            <SubNavDisclosure
              title="Submission queues"
              count={badges?.submissions ?? 0}
              active={pathname.startsWith("/admin/submissions")}
              storageKey="lounge-sidebar:admin-submissions"
            >
              <SubmissionsSubList pathname={pathname} onNavigate={onNavigate} />
            </SubNavDisclosure>
          )}
          {item.href === "/admin/forms" && (
            <SubNavDisclosure
              title="Form library"
              count={badges?.formRequests ?? 0}
              active={pathname.startsWith("/admin/forms")}
              storageKey="lounge-sidebar:admin-forms"
            >
              <FormsSubList pathname={pathname} onNavigate={onNavigate} />
            </SubNavDisclosure>
          )}
          {/* "Request forms" only appears once you've clicked into Forms
              (i.e. you're on the /lounge/forms page) — it doesn't sit in the
              section list until then. */}
          {item.href === "/lounge/forms" && pathname.startsWith("/lounge/forms") && (
            <SubNavDisclosure
              title="Request a form"
              active={pathname.startsWith("/lounge/forms")}
              storageKey="lounge-sidebar:crew-forms"
            >
              <CrewFormsSubList pathname={pathname} onNavigate={onNavigate} />
            </SubNavDisclosure>
          )}
        </Fragment>
      ))}
    </div>
  );
}

interface SubmissionCategory { formType: string; total: number; unread: number; latest: string | null }

const SUBMISSION_LABELS: Record<string, string> = {
  "Birthday Party Appearance Request": "Birthday Visits",
  "Birthday Party at Station Request": "Station Birthdays",
  "Ride Along Request": "Ride-Alongs",
  "Event Appearance Request": "Event Visits",
  "Education Request": "Education Visits",
  "Equipment Request": "Equipment Requests",
  "Employment Application": "Applications",
  "Run Number Request": "Run Number Requests",
  birthday: "Birthday Visits",
  "ride-along": "Ride-Alongs",
  "event-request": "Event Visits",
  "education-request": "Education Visits",
  "equipment-request": "Equipment Requests",
  employment: "Applications",
  contact: "Contact Messages",
  donate: "Donations",
  "birthday-station": "Station Birthdays",
};

function submissionLabel(formType: string): string {
  return SUBMISSION_LABELS[formType] ?? formType
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function normalizedSubmissionType(formType: string): string {
  return formType.toLowerCase().replace(/[_-]/g, " ");
}

function isApplicationSubmission(formType: string): boolean {
  return normalizedSubmissionType(formType).includes("employment")
    || normalizedSubmissionType(formType).includes("application");
}

function isBirthdaySubmission(formType: string): boolean {
  return normalizedSubmissionType(formType).includes("birthday");
}

function isVisitSubmission(formType: string): boolean {
  const t = normalizedSubmissionType(formType);
  if (t.includes("birthday")) return false;
  return t.includes("event")
    || t.includes("education")
    || t.includes("ride along")
    || t.includes("ridealong")
    || t.includes("visit")
    || t.includes("appearance");
}

interface RegistryItem { id: string; label: string; bulkAssignable: boolean }
interface FormsAdminPayload { registry: RegistryItem[] }

function SubNavDisclosure({
  title,
  count = 0,
  active,
  storageKey,
  children,
}: {
  title: string;
  count?: number;
  active: boolean;
  storageKey: string;
  children: React.ReactNode;
}) {
  // Same policy as NavSection: always start collapsed on a fresh
  // page-load. Removing the localStorage persistence keeps the sidebar
  // tidy when the user navigates back to the site.
  const [open, setOpen] = useState<boolean>(false);

  function toggle() {
    setOpen((cur) => !cur);
  }
  void storageKey; // retained for compatibility — no longer used

  return (
    <div style={{ margin: "2px 0 6px 39px", display: "grid", gap: 4 }}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          minHeight: 30,
          padding: "5px 9px",
          borderRadius: 9,
          border: active ? "1px solid rgba(240,180,41,0.22)" : "1px solid rgba(255,255,255,0.055)",
          background: active ? "rgba(240,180,41,0.08)" : "rgba(255,255,255,0.025)",
          color: active ? "#f0b429" : "#94a3b8",
          fontFamily: "inherit",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span aria-hidden style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.14s var(--mas-ease)" }}>
          ▸
        </span>
        <span style={{ flex: 1 }}>{title}</span>
        {count > 0 && <UnreadPill count={count} />}
      </button>
      {open && (
        <div style={{
          display: "grid",
          gap: 1,
          padding: "2px 0 2px 8px",
          borderLeft: "1px solid rgba(125,211,252,0.18)",
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

function FormsSubList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const [registry, setRegistry] = useState<RegistryItem[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/admin/forms", { cache: "no-store" });
        if (!r.ok) { if (!cancelled) setRegistry([]); return; }
        const d = (await r.json()) as FormsAdminPayload;
        if (!cancelled) setRegistry(Array.isArray(d.registry) ? d.registry : []);
      } catch { if (!cancelled) setRegistry([]); }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (registry === null || registry.length === 0) return null;
  const activeOnFormsPage = pathname.startsWith("/admin/forms");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 2 }}>
      {registry.map((r) => (
        <Link
          key={r.id}
          href={`/admin/forms?type=${encodeURIComponent(r.id)}`}
          onClick={onNavigate}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "5px 10px", borderRadius: 8,
            color: activeOnFormsPage ? "#cbd5e1" : "#94a3b8",
            background: "transparent",
            textDecoration: "none", fontSize: 12, fontWeight: 600,
          }}
        >
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
          {r.bulkAssignable && (
            <span style={{ color: "#f0b429", fontSize: 8, fontWeight: 900, letterSpacing: "0.14em", background: "rgba(240,180,41,0.10)", border: "1px solid rgba(240,180,41,0.30)", padding: "1px 5px", borderRadius: 4 }}>BULK</span>
          )}
        </Link>
      ))}
    </div>
  );
}

interface CatalogItem { id: string; label: string }

function CrewFormsSubList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const [catalog, setCatalog] = useState<CatalogItem[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/lounge/form-requests", { cache: "no-store" });
        if (!r.ok) { if (!cancelled) setCatalog([]); return; }
        const d = await r.json();
        if (!cancelled) setCatalog(Array.isArray(d.catalog) ? d.catalog : []);
      } catch { if (!cancelled) setCatalog([]); }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (catalog === null || catalog.length === 0) return null;
  const active = pathname.startsWith("/lounge/forms");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 2 }}>
      <div style={{ color: "#94a3b8", fontSize: 9, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", padding: "2px 10px 4px" }}>
        Request a form
      </div>
      {catalog.map((c) => (
        <Link
          key={c.id}
          href={`/lounge/forms?request=${encodeURIComponent(c.id)}`}
          onClick={onNavigate}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "5px 10px", borderRadius: 8,
            color: active ? "#cbd5e1" : "#94a3b8",
            background: "transparent",
            textDecoration: "none", fontSize: 12, fontWeight: 600,
          }}
        >
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.label}</span>
        </Link>
      ))}
    </div>
  );
}

function SubmissionsSubList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const [cats, setCats] = useState<SubmissionCategory[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/admin/submissions", { cache: "no-store" });
        if (!r.ok) { if (!cancelled) setCats([]); return; }
        const d = await r.json();
        if (!cancelled) setCats(Array.isArray(d) ? d : []);
      } catch {
        if (!cancelled) setCats([]);
      }
    }
    load();
    const intervalId = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(intervalId); };
  }, []);

  if (cats === null || cats.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 2 }}>
      {cats.map((c) => {
        const href = `/admin/submissions?type=${encodeURIComponent(c.formType)}`;
        const active = pathname.startsWith("/admin/submissions") && typeof window !== "undefined" && new URL(window.location.href).searchParams.get("type") === c.formType;
        return (
          <Link
            key={c.formType}
            href={href}
            onClick={onNavigate}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 10px",
              borderRadius: 8,
              color: active ? "#f0b429" : "#cbd5e1",
              background: active ? "rgba(240,180,41,0.10)" : "transparent",
              textDecoration: "none",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{submissionLabel(c.formType)}</span>
            {c.unread > 0 && (
              <span style={{ background: "#ef4444", color: "white", fontSize: 9, fontWeight: 900, padding: "1px 6px", borderRadius: 999, minWidth: 16, textAlign: "center" }}>
                {c.unread}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function badgeForItem(item: NavItem, badges?: ShellBadges): number {
  if (!badges) return 0;
  if (item.href === "/lounge/notifications") return badges.notifications;
  if (item.href === "/lounge/messages") return badges.messages;
  if (item.href === "/admin/submissions") return badges.submissions;
  if (item.href === "/admin/forms") return badges.formRequests;
  if (item.href === "/admin/employees") return badges.profileRequests;
  return 0;
}

const navSection: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.20em",
  textTransform: "uppercase",
  padding: "2px 10px 5px",
  fontFamily: "var(--font-mas-mono), ui-monospace, monospace",
};

function NavRow({ item, active, onNavigate, badge = 0 }: { item: NavItem; active: boolean; onNavigate?: () => void; badge?: number }) {
  const isAdminLink = item.adminOnly === true;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 10px",
        borderRadius: 11,
        color: active ? "#f0b429" : isAdminLink ? "#c4b5fd" : "#cbd5e1",
        background: active ? "rgba(240,180,41,0.12)" : "transparent",
        textDecoration: "none",
        fontWeight: active ? 800 : 600,
        fontSize: 14,
        border: active ? "1px solid rgba(240,180,41,0.30)" : "1px solid transparent",
        transition: "background 0.12s, color 0.12s",
        position: "relative",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "relative",
          width: 28, height: 28, borderRadius: 8,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: active ? "rgba(240,180,41,0.18)" : "rgba(255,255,255,0.045)",
          border: `1px solid ${active ? "rgba(240,180,41,0.34)" : "rgba(255,255,255,0.07)"}`,
          color: active ? "#f0b429" : isAdminLink ? "#c4b5fd" : "#94a3b8",
        }}
      >
        <LoungeIcon name={item.icon} size={17} />
        {badge > 0 && <UnreadDot count={badge} corner />}
      </span>
      <span style={{ flex: 1 }}>{item.label}</span>
      {badge > 0 && <UnreadPill count={badge} />}
      {item.external && (
        <span aria-hidden style={{ fontSize: 11, color: "#64748b" }}>↗</span>
      )}
    </Link>
  );
}

/**
 * Numeric red pill — Facebook-style — for the trailing edge of the nav
 * row. Above 99, collapses to "99+".
 */
function UnreadPill({ count }: { count: number }) {
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      aria-label={`${count} unread`}
      style={{
        minWidth: 18,
        height: 18,
        padding: "0 6px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        background: "#ef4444",
        color: "white",
        fontFamily: "var(--font-mas-mono), ui-monospace, monospace",
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: 0,
        lineHeight: 1,
        boxShadow: "0 0 0 2px #040d1a",
      }}
    >
      {label}
    </span>
  );
}

/**
 * Tiny red dot anchored to the corner of the row's icon tile — meant
 * for the icon-only badge surface (bottom tab bar + drawer triggers).
 * Renders no number when `corner` is true; otherwise can include a count.
 */
function UnreadDot({ corner, count }: { corner?: boolean; count?: number }) {
  if (corner) {
    return (
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: -2,
          right: -2,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#ef4444",
          boxShadow: "0 0 0 2px #040d1a",
        }}
      />
    );
  }
  return <UnreadPill count={count ?? 1} />;
}

function SignOutButton({ compact }: { compact?: boolean } = {}) {
  return (
    <form action="/api/lounge/logout" method="post" style={{ display: compact ? "inline-flex" : "flex", margin: 0 }}>
      <button
        type="submit"
        aria-label="Sign out"
        title="Sign out"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          width: compact ? undefined : "100%",
          background: "rgba(239,68,68,0.10)",
          border: "1px solid rgba(239,68,68,0.30)",
          color: "#fca5a5",
          padding: compact ? "6px 10px" : "8px 12px",
          borderRadius: 10,
          fontSize: compact ? 10 : 11,
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          cursor: "pointer",
          fontFamily: "inherit",
          flexShrink: 0,
        }}
      >
        <svg viewBox="0 0 24 24" width={compact ? 14 : 16} height={compact ? 14 : 16} fill="currentColor" aria-hidden>
          <path d="M16 13v-2H7V8l-5 4 5 4v-3h9zm3-10H9c-1.1 0-2 .9-2 2v4h2V5h10v14H9v-4H7v4c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
        </svg>
        {!compact && <span>Sign out</span>}
      </button>
    </form>
  );
}

function IdentityChip({ me, compact }: { me: SidebarMe; compact?: boolean }) {
  const initials = (me.firstName[0] + me.lastName[0]).toUpperCase();
  const accessLabel = me.isAdmin ? "Admin" : "User";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: compact ? "6px 10px 6px 6px" : "10px 12px 10px 10px",
        minWidth: 0,
      }}
    >
      <div
        style={{
          position: "relative",
          width: compact ? 36 : 44,
          height: compact ? 36 : 44,
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          background: "rgba(240,180,41,0.14)",
          border: "1px solid rgba(240,180,41,0.30)",
          color: "#f0b429",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 900,
          fontSize: compact ? 12 : 14,
        }}
      >
        {me.photoUrl ? (
          <img src={me.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          initials
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.18, minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: compact ? 13 : 14, fontWeight: 800, color: "white" }}>
          {me.firstName} {me.lastName}
        </span>
        <span
          style={{
            marginTop: 4,
            alignSelf: "flex-start",
            fontSize: 9,
            fontWeight: 900,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            padding: "2px 8px",
            borderRadius: 999,
            background: me.isAdmin ? "rgba(240,180,41,0.18)" : "rgba(148,163,184,0.15)",
            color: me.isAdmin ? "#f0b429" : "#cbd5e1",
            border: `1px solid ${me.isAdmin ? "rgba(240,180,41,0.35)" : "rgba(148,163,184,0.30)"}`,
          }}
        >
          {accessLabel}
        </span>
      </div>
    </div>
  );
}

type LoungeIconName =
  | "alert"
  | "ambulance"
  | "archive"
  | "badge"
  | "bell"
  | "book"
  | "box"
  | "calendar"
  | "certificate"
  | "chart"
  | "checkCircle"
  | "droplet"
  | "folder"
  | "gamepad"
  | "gear"
  | "hospital"
  | "inbox"
  | "mail"
  | "menu"
  | "message"
  | "newspaper"
  | "shield"
  | "ticker"
  | "toolbox"
  | "users"
  | "wrench";

function LoungeIcon({ name, size = 18 }: { name: LoungeIconName; size?: number }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const paths: Record<LoungeIconName, React.ReactNode> = {
    alert: <><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></>,
    ambulance: <><path d="M3 6h10v10H3z" /><path d="M13 10h4l3 4v2h-3" /><path d="M7 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /><path d="M17 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /><path d="M8 8v5" /><path d="M5.5 10.5h5" /></>,
    archive: <><path d="M4 7h16" /><path d="M6 7v13h12V7" /><path d="M4 4h16v3H4z" /><path d="M10 11h4" /></>,
    badge: <><path d="M12 3 5 6v6c0 4.3 2.8 8.2 7 9 4.2-.8 7-4.7 7-9V6l-7-3Z" /><path d="M9 12h6" /><path d="M12 9v6" /></>,
    bell: <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" /><path d="M10 21h4" /></>,
    book: <><path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3Z" /><path d="M4 17a3 3 0 0 1 3-3h11" /><path d="M8 8h6" /></>,
    box: <><path d="m21 8-9-5-9 5 9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></>,
    calendar: <><path d="M4 6h16v14H4z" /><path d="M4 10h16" /><path d="M8 4v4" /><path d="M16 4v4" /></>,
    certificate: <><path d="M6 3h12v14H6z" /><path d="M9 7h6" /><path d="M9 11h6" /><path d="m10 17-1 4 3-2 3 2-1-4" /></>,
    chart: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="M8 16v-5" /><path d="M12 16V8" /><path d="M16 16v-7" /></>,
    checkCircle: <><path d="M21 11.1V12a9 9 0 1 1-5.3-8.2" /><path d="m9 11 3 3L22 4" /></>,
    droplet: <><path d="M12 3s6 6.3 6 11a6 6 0 0 1-12 0c0-4.7 6-11 6-11Z" /></>,
    folder: <><path d="M3 6h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></>,
    gamepad: <><path d="M6 12h4" /><path d="M8 10v4" /><path d="M15 12h.01" /><path d="M18 10h.01" /><path d="M5.5 8h13a3.5 3.5 0 0 1 3.2 4.9l-1.4 3.4a2.5 2.5 0 0 1-4.2.7L14.8 16H9.2l-1.3 1a2.5 2.5 0 0 1-4.2-.7l-1.4-3.4A3.5 3.5 0 0 1 5.5 8Z" /></>,
    gear: <><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3-.2-.1a1.7 1.7 0 0 0-1.9-.2 1.7 1.7 0 0 0-1 1.5V21h-3.4v-.3a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.2l-.2.1-2-3 .1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H5v-3.4h.3a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-3 .2.1a1.7 1.7 0 0 0 1.9.2 1.7 1.7 0 0 0 1-1.5V3h3.4v.3a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.2l.2-.1 2 3-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.3V14h-.3a1.7 1.7 0 0 0-1.7 1Z" /></>,
    hospital: <><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" /><path d="M3 21h18" /><path d="M10 8h4" /><path d="M12 6v4" /><path d="M9 21v-5h6v5" /></>,
    inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" /></>,
    mail: <><path d="M4 6h16v12H4z" /><path d="m4 7 8 6 8-6" /></>,
    menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
    message: <><path d="M4 5h16v11H8l-4 4V5Z" /></>,
    newspaper: <><path d="M4 5h14a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2V5Z" /><path d="M8 9h8" /><path d="M8 13h8" /><path d="M8 17h5" /></>,
    shield: <><path d="M12 3 4 6v6c0 4.4 3.2 8.4 8 9 4.8-.6 8-4.6 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></>,
    ticker: <><path d="M4 6h16v12H4z" /><path d="M7 10h5" /><path d="M14 10h3" /><path d="M7 14h10" /></>,
    toolbox: <><path d="M9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" /><path d="M4 8h16v11H4z" /><path d="M4 12h16" /><path d="M12 12v3" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M22 21v-2a4 4 0 0 0-3-3.9" /><path d="M16 3.1a4 4 0 0 1 0 7.8" /></>,
    wrench: <><path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.8 2.8-3-3 2.8-2.8Z" /></>,
  };

  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden style={{ display: "block" }} {...common}>
      {paths[name]}
    </svg>
  );
}

function isActive(pathname: string, item: NavItem): boolean {
  if (item.external) return false; // SSO redirects, never "current"
  if (item.href === "/lounge") return pathname === "/lounge";
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

function currentPageLabel(pathname: string): string {
  for (const n of NAV) {
    if (!n.external && isActive(pathname, n)) {
      return n.label;
    }
  }
  return "Employee Lounge";
}
