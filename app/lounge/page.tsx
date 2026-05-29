import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import { expiringCertsForEmployee, type EmployeeCert } from "@/lib/lounge/certs";
import { listAcksForViewer, type Ack } from "@/lib/lounge/acks";
import LoungeShell from "@/components/lounge/LoungeShell";
import Wall from "@/components/lounge/Wall";
import PasskeyPrompt from "@/components/lounge/PasskeyPrompt";
import TodayEventsWidget from "@/components/lounge/TodayEventsWidget";
import BirthdayBanner from "@/components/lounge/BirthdayBanner";
import PollsWidget from "@/components/lounge/PollsWidget";
import { listTodaysBirthdays } from "@/lib/lounge/birthdays";
import WelcomeOverlay from "@/components/lounge/WelcomeOverlay";
import CoffeePrankOverlay from "@/components/lounge/CoffeePrankOverlay";

const PRANK_USERNAMES = new Set(["kwetzel", "jgoetz"]);

// Per-employee welcome-screen image overrides. Drop a PNG at
// /lounge/welcome-overrides/<username>.png and add the username to
// the map below to replace the EMS crest for that one person.
const WELCOME_IMAGE_OVERRIDES: Record<string, string> = {
  dspencer: "/lounge/welcome-overrides/dylan-spencer.png",
};
function welcomeOverrideFor(username: string): string | null {
  return WELCOME_IMAGE_OVERRIDES[username] ?? null;
}

export const dynamic = "force-dynamic";

export default async function LoungeHome() {
  const session = await currentEmployee();
  if (!session) redirect("/lounge/login");

  const [emp, expiring, acks, birthdays] = await Promise.all([
    getEmployee(session.id),
    expiringCertsForEmployee(session.id),
    listAcksForViewer(session.id),
    listTodaysBirthdays(),
  ]);

  const me = {
    firstName: session.firstName,
    lastName: session.lastName,
    certification: emp?.certification ?? null,
    photoUrl: emp?.photoUrl ?? null,
    isAdmin: session.isAdmin,
  };

  const pendingAcks = acks.filter((ack) => ack.requiresAcknowledgment && !ack.acknowledgedAt);
  const latestNotice = acks[0] ?? null;

  return (
    <LoungeShell me={me}>
      <style>{LOUNGE_HOME_CSS}</style>
      <BirthdayBanner people={birthdays} />
      <PasskeyPrompt />
      <div className="lounge-command-page">
        <CommandHeader
          firstName={session.firstName}
          rank={emp?.position ?? emp?.certification ?? "Crew"}
          isAdmin={session.isAdmin}
          pendingAcks={pendingAcks.length}
          expiringCerts={expiring.length}
        />

        {expiring.length > 0 && <CertAlertsBanner certs={expiring} />}

        <LoungeActions hasPhoto={Boolean(emp?.photoUrl)} />

        <TodayEventsWidget />
        <PollsWidget />

        <div className="lounge-command-grid">
          <div className="lounge-main-stack">
            <Wall
              me={{
                id: session.id,
                firstName: session.firstName,
                lastName: session.lastName,
                photoUrl: emp?.photoUrl ?? null,
                isAdmin: session.isAdmin,
              }}
            />
          </div>

          <CommandRail
            pendingAcks={pendingAcks}
            expiring={expiring}
            latestNotice={latestNotice}
            isAdmin={session.isAdmin}
          />
        </div>
      </div>

      {PRANK_USERNAMES.has(session.username)
        ? <CoffeePrankOverlay name={session.firstName} />
        : <WelcomeOverlay name={session.firstName} customImage={welcomeOverrideFor(session.username)} />}
    </LoungeShell>
  );
}

function CommandHeader({
  firstName,
  rank,
  isAdmin,
  pendingAcks,
  expiringCerts,
}: {
  firstName: string;
  rank: string;
  isAdmin: boolean;
  pendingAcks: number;
  expiringCerts: number;
}) {
  const now = new Date();
  const statusChips = [
    { label: "Pending Items", value: `${pendingAcks + expiringCerts}` },
    { label: "Rank", value: rank },
    { label: "Access", value: isAdmin ? "Admin" : "User" },
  ];

  return (
    <header className="lounge-hero">
      <div className="lounge-hero-copy">
        <div className="lounge-eyebrow">{formatDateLine(now)}</div>
        <h1 className="lounge-hero-title">Employee Lounge</h1>
        <p className="lounge-hero-welcome">
          Welcome back, {firstName}. Wall posts, messages, forms, credentials, and crew tools stay in one clean shift view.
        </p>
        <div className="lounge-status-strip">
          {statusChips.map((chip) => (
            <div key={chip.label}>
              <span>{chip.label}</span>
              <strong>{chip.value}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="lounge-hero-mark" aria-hidden>
        <Image src="/lounge/lounge-button.png" alt="" width={220} height={156} />
      </div>
    </header>
  );
}

function LoungeActions({ hasPhoto }: { hasPhoto: boolean }) {
  const actions = [
    {
      href: "/lounge/messages",
      label: "Messages",
      meta: "Crew DMs",
      accent: "cyan",
    },
    {
      href: "/lounge/maintenance",
      label: "Maintenance",
      meta: "Unit, station, equipment",
      accent: "gold",
    },
    {
      href: "/lounge/incidents",
      label: "Incident Reports",
      meta: "Submit documentation",
      accent: "red",
    },
    {
      href: "/lounge/about-me",
      label: hasPhoto ? "Profile Photo" : "Add Profile Photo",
      meta: hasPhoto ? "Update your headshot" : "Shows on Wall and chat",
      accent: "cyan",
    },
    {
      href: "/lounge/certs",
      label: "Certifications",
      meta: "Renewals and uploads",
      accent: "gold",
    },
    {
      href: "/lounge/hospitals",
      label: "Hospitals",
      meta: "Destinations and notes",
      accent: "blue",
    },
    {
      href: "/lounge/acks",
      label: "Required Acks",
      meta: "Acknowledgments",
      accent: "blue",
    },
    {
      href: "/lounge/games",
      label: "Training Games",
      meta: "ABG and ECG practice",
      accent: "cyan",
    },
  ];

  return (
    <section className="lounge-action-dock" aria-label="Employee Lounge shortcuts">
      <div className="lounge-action-head">
        <div>
          <span>Shift tools</span>
          <h2>Fast actions</h2>
        </div>
        <p>Common crew tasks, forms, messages, and resources without digging through menus.</p>
      </div>
      <div className="lounge-actions-grid">
        {actions.map((action) => (
          <Link key={action.href} href={action.href} className={`lounge-action-card tone-${action.accent}`}>
            <span className="lounge-action-dot" aria-hidden />
            <strong>{action.label}</strong>
            <small>{action.meta}</small>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CommandRail({
  pendingAcks,
  expiring,
  latestNotice,
  isAdmin,
}: {
  pendingAcks: Ack[];
  expiring: EmployeeCert[];
  latestNotice: Ack | null;
  isAdmin: boolean;
}) {
  return (
    <aside className="lounge-command-rail">
      <RailCard title="At a glance">
        <RailMetric label="Pending acknowledgments" value={pendingAcks.length} href="/lounge/acks" />
        <RailMetric label="Credentials due" value={expiring.length} href="/lounge/certs" />
      </RailCard>

      <RailCard title="Latest announcement">
        {latestNotice ? (
          <Link href="/lounge/acks" className="lounge-notice-link">
            <span>{latestNotice.category}</span>
            <strong>{latestNotice.title}</strong>
            <small>{timeAgo(latestNotice.createdAt)}</small>
          </Link>
        ) : (
          <p className="lounge-empty">No notices posted.</p>
        )}
      </RailCard>

      {isAdmin && (
        <RailCard title="Admin controls">
          <div className="lounge-admin-links">
            <Link href="/admin/calls">Ticker editor</Link>
            <Link href="/lounge/acks">Create notice</Link>
            <Link href="/admin/employees">Employee records</Link>
          </div>
        </RailCard>
      )}
    </aside>
  );
}

function CertAlertsBanner({ certs }: { certs: EmployeeCert[] }) {
  const expired = certs.filter((cert) => cert.status === "expired");
  const final7 = certs.filter((cert) => cert.status === "final_7");
  const soon = certs.filter(
    (cert) => cert.status === "30" || cert.status === "60" || cert.status === "90" || cert.status === "120",
  );
  const blocking = expired.length > 0;

  return (
    <section className={blocking ? "lounge-cert-banner is-blocking" : "lounge-cert-banner"}>
      <div>
        <span>{blocking ? "Action Required" : "Credential Heads Up"}</span>
        <h2>
          {blocking
            ? `${expired.length} expired certification${expired.length === 1 ? "" : "s"} need attention.`
            : `${certs.length} certification${certs.length === 1 ? "" : "s"} need attention soon.`}
        </h2>
      </div>
      <ul>
        {[...expired, ...final7, ...soon].slice(0, 5).map((cert) => (
          <li key={cert.id}>
            <strong>{cert.certTypeName}</strong>
            <span>{cert.status === "expired" ? "Expired" : cert.daysLeft === 0 ? "Today" : `${cert.daysLeft}d`}</span>
          </li>
        ))}
      </ul>
      <Link href="/lounge/certs">Open certs</Link>
    </section>
  );
}

function RailCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="lounge-rail-card">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function RailMetric({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="lounge-rail-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </Link>
  );
}

function formatDateLine(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function timeAgo(input: string) {
  const then = new Date(input).getTime();
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const LOUNGE_HOME_CSS = `
.lounge-command-page {
  display: grid;
  gap: 16px;
}
.lounge-hero {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
  min-height: 154px;
  padding: 22px 24px;
  border: 1px solid rgba(148,163,184,0.22);
  border-radius: 22px;
  background:
    linear-gradient(90deg, rgba(37,99,235,0.28), transparent 44%),
    radial-gradient(circle at 88% 18%, rgba(240,180,41,0.22), transparent 15rem),
    radial-gradient(circle at 14% 0%, rgba(56,189,248,0.16), transparent 18rem),
    linear-gradient(135deg, #081a33 0%, #020912 100%);
  box-shadow: 0 18px 52px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.08);
}
.lounge-hero::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
  background-size: 22px 22px;
  mask-image: linear-gradient(90deg, black, transparent 76%);
}
.lounge-hero::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: linear-gradient(90deg, #f0b429, #38bdf8, transparent);
}
.lounge-hero-copy {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
}
.lounge-hero-title {
  margin: 7px 0 0;
  color: white;
  font-size: clamp(2.35rem, 4.4vw, 4.5rem);
  line-height: 0.92;
  letter-spacing: -0.035em;
  font-weight: 950;
}
.lounge-hero-welcome {
  max-width: 640px;
  margin: 12px 0 0;
  color: #dbeafe;
  font-size: 1rem;
  line-height: 1.55;
  font-weight: 650;
}
.lounge-eyebrow,
.lounge-cert-banner span,
.lounge-notice-link span {
  display: block;
  color: #f0b429;
  font-size: 0.68rem;
  font-weight: 950;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}
.lounge-status-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
.lounge-status-strip div {
  min-width: 116px;
  padding: 9px 12px;
  border-radius: 999px;
  background: rgba(2,9,18,0.52);
  border: 1px solid rgba(255,255,255,0.12);
}
.lounge-status-strip span,
.lounge-rail-metric span {
  display: block;
  color: #94a3b8;
  font-size: 0.68rem;
  font-weight: 850;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.lounge-status-strip strong {
  display: block;
  margin-top: 3px;
  color: white;
  font-size: 0.88rem;
  line-height: 1.2;
}
.lounge-hero-mark {
  position: relative;
  z-index: 1;
  width: 220px;
  min-width: 180px;
  display: flex;
  justify-content: flex-end;
}
.lounge-hero-mark img {
  width: 210px;
  height: auto;
  filter: drop-shadow(0 16px 28px rgba(0,0,0,0.48)) drop-shadow(0 0 28px rgba(56,189,248,0.14));
}
.lounge-action-dock {
  position: relative;
  overflow: hidden;
  padding: 16px;
  border: 1px solid rgba(148,163,184,0.16);
  border-radius: 20px;
  background:
    radial-gradient(circle at 0% 0%, rgba(56,189,248,0.10), transparent 15rem),
    linear-gradient(180deg, rgba(15,32,58,0.92), rgba(7,20,40,0.96));
  box-shadow: 0 14px 36px rgba(0,0,0,0.22);
}
.lounge-action-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: end;
  margin-bottom: 12px;
}
.lounge-action-head span {
  display: block;
  color: #f0b429;
  font-size: 0.66rem;
  font-weight: 950;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}
.lounge-action-head h2 {
  margin: 4px 0 0;
  color: white;
  font-size: 1.2rem;
  line-height: 1.05;
  letter-spacing: -0.02em;
}
.lounge-action-head p {
  max-width: 360px;
  margin: 0;
  color: #94a3b8;
  font-size: 0.82rem;
  line-height: 1.45;
}
.lounge-actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 9px;
}
.lounge-action-card {
  position: relative;
  display: grid;
  gap: 5px;
  min-height: 78px;
  padding: 13px 14px 13px 42px;
  border-radius: 15px;
  text-decoration: none;
  background: rgba(255,255,255,0.045);
  border: 1px solid rgba(255,255,255,0.09);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
  transition: transform 150ms ease, border-color 150ms ease, background 150ms ease;
}
.lounge-action-card:hover {
  transform: translateY(-1px);
  background: rgba(255,255,255,0.065);
  border-color: rgba(255,255,255,0.18);
}
.lounge-action-dot {
  position: absolute;
  left: 14px;
  top: 17px;
  width: 15px;
  height: 15px;
  border-radius: 999px;
  box-shadow: 0 0 18px currentColor;
}
.lounge-action-card strong {
  min-width: 0;
  color: white;
  font-size: 0.92rem;
  line-height: 1.15;
  overflow-wrap: anywhere;
}
.lounge-action-card small {
  min-width: 0;
  color: #94a3b8;
  font-size: 0.72rem;
  line-height: 1.25;
  font-weight: 750;
  overflow-wrap: anywhere;
}
.tone-gold .lounge-action-dot { color: #f0b429; background: #f0b429; }
.tone-cyan .lounge-action-dot { color: #38bdf8; background: #38bdf8; }
.tone-blue .lounge-action-dot { color: #60a5fa; background: #60a5fa; }
.tone-red .lounge-action-dot { color: #fb7185; background: #fb7185; }
.tone-gold { border-color: rgba(240,180,41,0.18); }
.tone-cyan { border-color: rgba(56,189,248,0.18); }
.tone-blue { border-color: rgba(96,165,250,0.18); }
.tone-red { border-color: rgba(251,113,133,0.18); }
}
.lounge-cert-banner {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.8fr) auto;
  gap: 14px;
  align-items: center;
  padding: 16px;
  border-radius: 20px;
  background: rgba(240,180,41,0.08);
  border: 1px solid rgba(240,180,41,0.28);
  border-left: 5px solid #f0b429;
}
.lounge-cert-banner.is-blocking {
  background: rgba(239,68,68,0.1);
  border-color: rgba(239,68,68,0.38);
  border-left-color: #ef4444;
}
.lounge-cert-banner h2 {
  margin: 5px 0 0;
  color: white;
  font-size: 1rem;
}
.lounge-cert-banner ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}
.lounge-cert-banner li {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: #e2e8f0;
  font-size: 0.82rem;
}
.lounge-cert-banner a,
.lounge-rail-button {
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  padding: 0 14px;
  background: #f0b429;
  color: #040d1a;
  text-decoration: none;
  font-size: 0.72rem;
  font-weight: 950;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.lounge-rail-card {
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(37,99,235,0.08), transparent),
    #071428;
  box-shadow: 0 12px 34px rgba(0,0,0,0.2);
}
.lounge-rail-card h3 {
  margin: 5px 0 0;
  color: white;
  font-size: 1.08rem;
  line-height: 1.1;
  letter-spacing: -0.025em;
}
.lounge-command-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 14px;
  align-items: start;
}
.lounge-main-stack {
  display: grid;
  gap: 14px;
  min-width: 0;
}
.lounge-rail-metric,
.lounge-notice-link {
  border-radius: 16px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
}
.lounge-empty {
  margin: 12px 0 0;
  color: #94a3b8;
  font-size: 0.9rem;
  line-height: 1.55;
}
.lounge-rail-card p {
  margin: 7px 0 0;
  color: #94a3b8;
  font-size: 0.84rem;
  line-height: 1.55;
}
.lounge-command-rail {
  position: sticky;
  top: 14px;
  display: grid;
  gap: 10px;
}
.lounge-rail-card {
  padding: 18px 18px 20px;
}
.lounge-rail-metric {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 18px;
  text-decoration: none;
}
.lounge-rail-metric + .lounge-rail-metric {
  margin-top: 10px;
}
.lounge-rail-metric span {
  flex: 1;
  min-width: 0;
  padding-right: 8px;
}
.lounge-rail-metric strong {
  color: #f0b429;
  font-size: 1.45rem;
  line-height: 1;
}
.lounge-notice-link {
  display: block;
  margin-top: 12px;
  padding: 13px;
  text-decoration: none;
}
.lounge-notice-link strong {
  display: block;
  margin-top: 6px;
  color: white;
  line-height: 1.25;
}
.lounge-notice-link small {
  display: block;
  margin-top: 8px;
  color: #94a3b8;
}
.lounge-rail-button {
  width: 100%;
  margin-top: 14px;
}
.lounge-admin-links {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}
.lounge-admin-links a {
  color: #f0b429;
  text-decoration: none;
  font-size: 0.86rem;
  font-weight: 800;
}
@media (max-width: 1180px) {
  .lounge-command-grid,
  .lounge-hero {
    grid-template-columns: 1fr;
  }
  .lounge-command-rail {
    position: static;
  }
}
@media (max-width: 760px) {
  .lounge-hero,
  .lounge-rail-card,
  .lounge-cert-banner {
    border-radius: 18px;
  }
  .lounge-hero {
    padding: 20px;
    display: grid;
  }
  .lounge-hero-title-row {
    display: block;
  }
  .lounge-hero h1 {
    white-space: normal;
  }
  .lounge-hero p {
    margin-top: 10px;
  }
  .lounge-hero-mark {
    display: none;
  }
  .lounge-status-strip,
  .lounge-cert-banner {
    grid-template-columns: 1fr;
  }
  .lounge-action-head {
    display: grid;
    align-items: start;
  }
  .lounge-action-head p {
    max-width: none;
  }
}
`;
