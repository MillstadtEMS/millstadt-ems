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
import WelcomeOverlay from "@/components/lounge/WelcomeOverlay";
import CoffeePrankOverlay from "@/components/lounge/CoffeePrankOverlay";

const PRANK_USERNAMES = new Set(["kwetzel", "jgoetz"]);

export const dynamic = "force-dynamic";

export default async function LoungeHome() {
  const session = await currentEmployee();
  if (!session) redirect("/lounge/login");

  const [emp, expiring, acks] = await Promise.all([
    getEmployee(session.id),
    expiringCertsForEmployee(session.id),
    listAcksForViewer(session.id),
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
      <div className="lounge-command-page">
        <CommandHeader
          firstName={session.firstName}
          role={emp?.certification ?? "Crew"}
          isAdmin={session.isAdmin}
          pendingAcks={pendingAcks.length}
          expiringCerts={expiring.length}
        />

        {expiring.length > 0 && <CertAlertsBanner certs={expiring} />}

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
        : <WelcomeOverlay name={session.firstName} />}
    </LoungeShell>
  );
}

function CommandHeader({
  firstName,
  role,
  isAdmin,
  pendingAcks,
  expiringCerts,
}: {
  firstName: string;
  role: string;
  isAdmin: boolean;
  pendingAcks: number;
  expiringCerts: number;
}) {
  const now = new Date();
  const statusChips = [
    { label: "Available", value: "Crew portal" },
    { label: "Pending Items", value: `${pendingAcks + expiringCerts}` },
    { label: isAdmin ? "Admin" : "Employee", value: role },
  ];

  return (
    <header className="lounge-hero">
      <div className="lounge-hero-copy">
        <div className="lounge-eyebrow">{formatDateLine(now)}</div>
        <div className="lounge-hero-title-row">
          <h1>Employee Lounge</h1>
          <p>Welcome back, {firstName}. Crew posts, messages, acknowledgments, and admin tools.</p>
        </div>
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
        <Image src="/lounge/lounge-button.png" alt="" width={104} height={74} />
      </div>
    </header>
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
  gap: 14px;
}
.lounge-hero {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 132px;
  padding: 18px 20px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  background:
    linear-gradient(90deg, rgba(27,88,201,0.2), transparent 42%),
    radial-gradient(circle at 92% 0%, rgba(240,180,41,0.2), transparent 16rem),
    linear-gradient(135deg, #071428 0%, #020912 100%);
  box-shadow: 0 16px 46px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.07);
}
.lounge-hero-copy {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
}
.lounge-hero-title-row {
  display: flex;
  align-items: end;
  gap: 18px;
  justify-content: space-between;
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
.lounge-hero h1 {
  margin: 7px 0 0;
  color: white;
  font-size: clamp(2.15rem, 4vw, 4rem);
  line-height: 0.9;
  letter-spacing: -0.045em;
  font-weight: 950;
  white-space: nowrap;
}
.lounge-hero p {
  max-width: 430px;
  margin: 0;
  color: #cbd5e1;
  font-size: 0.92rem;
  line-height: 1.55;
  font-weight: 650;
}
.lounge-status-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
.lounge-status-strip div {
  min-height: 0;
  min-width: 128px;
  padding: 9px 12px;
  border-radius: 999px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.09);
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
  width: 112px;
  min-width: 112px;
  display: flex;
  justify-content: flex-end;
}
.lounge-hero-mark img {
  width: 104px;
  height: auto;
  filter: drop-shadow(0 14px 20px rgba(0,0,0,0.38));
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
}
`;
