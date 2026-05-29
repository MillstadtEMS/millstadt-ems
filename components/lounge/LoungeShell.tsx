"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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
  emoji: string;
  external?: boolean; // routes outside /lounge that need SSO
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: "/lounge",              label: "The Wall",         emoji: "📰", eyebrow: "Home" },
  { href: "/lounge/about-me",     label: "About Me",         emoji: "🪪" },
  { href: "/lounge/my-file",      label: "My Employee File", emoji: "🗂️" },
  { href: "/lounge/messages",     label: "Messages",         emoji: "💬" },
  { href: "/lounge/open-shifts",  label: "Open Shifts",      emoji: "📅" },
  { href: "/lounge/acks",         label: "Acknowledgments",  emoji: "✅" },
  { href: "/lounge/incidents",    label: "Maintenance & Reports", emoji: "🛠️" },
  { href: "/lounge/certs",        label: "My Certifications",     emoji: "🎓" },
  { href: "/api/lounge/sso/truckcheck", label: "Truck Check", emoji: "🚑", external: true },
  { href: "/api/lounge/sso/inventory",  label: "Inventory",   emoji: "📦", external: true },
  // Admin section — collapsed.
  { href: "/admin/employees",             label: "Employee Records",     emoji: "👥", adminOnly: true },
  { href: "/admin/admin-tools",           label: "Admin Tools",          emoji: "🧰", adminOnly: true },
  { href: "/admin/website-config",        label: "Website Configuration", emoji: "⚙️", adminOnly: true },
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
          style={{ background: "transparent", border: 0, color: "#f0b429", fontSize: 22, cursor: "pointer", padding: 4 }}
        >
          ☰
        </button>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
          <span style={{ color: "#f0b429", fontSize: 10, fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Employee Lounge
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
            <SidebarBody me={me} items={items} pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
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
            padding: "26px 18px",
            position: "sticky",
            top: 0,
            alignSelf: "start",
            maxHeight: "100vh",
            overflowY: "auto",
          }}
        >
          <SidebarBody me={me} items={items} pathname={pathname} />
        </aside>

        {/* Main content */}
        <main style={{ padding: "22px 22px 80px" }}>{children}</main>
      </div>

      <style>{`
        @keyframes lounge-drawer-in {
          0%   { transform: translateX(-32px); opacity: 0; }
          100% { transform: translateX(0);     opacity: 1; }
        }
        @keyframes lounge-drawer-fade {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function SidebarBody({
  me, items, pathname, onNavigate,
}: {
  me: SidebarMe;
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <Image src="/images/millstadt-ems/logo.png" alt="" width={36} height={36} style={{ borderRadius: 8 }} />
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ color: "#f0b429", fontSize: 10, fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Employee Lounge
          </div>
          <div style={{ color: "white", fontWeight: 900, fontSize: 17 }}>Millstadt EMS</div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <IdentityChip me={me} />
        <SignOutButton />
      </div>

      <nav style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((n) => {
          const active = isActive(pathname, n);
          const isAdminLink = n.adminOnly === true;
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={onNavigate}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 12px",
                borderRadius: 11,
                color: active ? "#f0b429" : isAdminLink ? "#fcd34d" : "#cbd5e1",
                background: active ? "rgba(240,180,41,0.10)" : "transparent",
                textDecoration: "none",
                fontWeight: active ? 800 : 600,
                fontSize: 14,
                border: active ? "1px solid rgba(240,180,41,0.25)" : "1px solid transparent",
              }}
            >
              <span style={{ fontSize: 17, width: 22, textAlign: "center" }} aria-hidden>{n.emoji}</span>
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.external && (
                <span aria-hidden style={{ fontSize: 11, color: "#64748b" }}>↗</span>
              )}
            </Link>
          );
        })}
      </nav>

    </>
  );
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
          width: compact ? 32 : 40,
          height: compact ? 32 : 40,
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
          fontSize: compact ? 11 : 13,
        }}
      >
        {me.photoUrl ? (
          <img src={me.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          initials
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15, minWidth: 0 }}>
        <span style={{ fontSize: compact ? 12 : 13, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {me.firstName} {me.lastName}
        </span>
        <span style={{ color: "#94a3b8", fontSize: compact ? 10 : 11, marginTop: 1 }}>
          {me.certification ?? "Crew"}
        </span>
      </div>
      {me.isAdmin && (
        <span
          style={{
            marginLeft: "auto",
            fontSize: 9,
            fontWeight: 900,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            padding: "2px 7px",
            borderRadius: 999,
            background: "rgba(240,180,41,0.18)",
            color: "#f0b429",
            border: "1px solid rgba(240,180,41,0.35)",
            flexShrink: 0,
          }}
        >
          Admin
        </span>
      )}
    </div>
  );
}

function isActive(pathname: string, item: NavItem): boolean {
  if (item.external) return false; // SSO redirects, never "current"
  if (item.href === "/lounge") return pathname === "/lounge";
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

function currentPageLabel(pathname: string): string {
  for (const n of NAV) {
    if (!n.external && (pathname === n.href || pathname.startsWith(n.href + "/"))) {
      return n.label;
    }
  }
  return "Employee Lounge";
}
