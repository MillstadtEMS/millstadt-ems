import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import { expiringCertsForEmployee, type EmployeeCert } from "@/lib/lounge/certs";
import { listAcksForViewer, type Ack } from "@/lib/lounge/acks";
import { listOpenShifts, type OpenShift } from "@/lib/lounge/open-shifts";
import LoungeShell from "@/components/lounge/LoungeShell";
import Wall from "@/components/lounge/Wall";
import WelcomeOverlay from "@/components/lounge/WelcomeOverlay";
import CoffeePrankOverlay from "@/components/lounge/CoffeePrankOverlay";

const PRANK_USERNAMES = new Set(["kwetzel", "jgoetz"]);

export const dynamic = "force-dynamic";

const quickActions = [
  { href: "/lounge/open-shifts", label: "Open Shift Sign-Up", detail: "Available coverage", icon: "plus" },
  { href: "/lounge/incidents", label: "Report Issue", detail: "Station, unit, safety", icon: "tool" },
  { href: "/lounge/certs", label: "Upload Credential", detail: "Certs and renewals", icon: "upload" },
  { href: "/lounge/acks", label: "Acknowledgments", detail: "Read and sign", icon: "check" },
];

const adminActions = [
  { href: "/admin/calls", label: "Ticker Editor", detail: "Live call strip", icon: "ticker" },
  { href: "/admin/employees", label: "Employee Records", detail: "Personnel admin", icon: "users" },
  { href: "/admin/admin-tools", label: "Admin Tools", detail: "Operations controls", icon: "shield" },
];

const trainingItems = [
  { title: "Annual compliance", status: "Track in Certs", href: "/lounge/certs" },
  { title: "Protocol updates", status: "Post as notice", href: "/lounge/acks" },
  { title: "Skills check-offs", status: "Admin managed", href: "/admin/classes" },
];

const resourceItems = [
  { title: "Policies and SOPs", href: "/lounge/acks", label: "Notices" },
  { title: "Maintenance requests", href: "/lounge/incidents", label: "Reports" },
  { title: "Inventory", href: "/api/lounge/sso/inventory", label: "SSO" },
  { title: "Truck check", href: "/api/lounge/sso/truckcheck", label: "SSO" },
];

const recognitions = [
  { type: "Clinical Save", name: "Crew Recognition", text: "Highlight saves, thank-yous, and strong calls on the Wall." },
  { type: "Above and Beyond", name: "Station Culture", text: "Pin recognition posts so the whole crew sees the win." },
  { type: "Training Complete", name: "Credential Growth", text: "Celebrate new certs, class completions, and milestones." },
];

export default async function LoungeHome() {
  const session = await currentEmployee();
  if (!session) redirect("/lounge/login");

  const [emp, expiring, openShifts, acks] = await Promise.all([
    getEmployee(session.id),
    expiringCertsForEmployee(session.id),
    listOpenShifts(session.id),
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
  const activeOpenShifts = openShifts.filter((shift) => shift.status === "open");
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
          openShifts={activeOpenShifts.length}
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
            <QuickActionDock isAdmin={session.isAdmin} />
            <ScheduleSnapshot openShifts={activeOpenShifts} />
            <TrainingResourcesRecognition isAdmin={session.isAdmin} />
          </div>

          <CommandRail
            pendingAcks={pendingAcks}
            openShifts={activeOpenShifts}
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
  openShifts,
  expiringCerts,
}: {
  firstName: string;
  role: string;
  isAdmin: boolean;
  pendingAcks: number;
  openShifts: number;
  expiringCerts: number;
}) {
  const now = new Date();
  const statusChips = [
    { label: "Available", value: "Crew portal" },
    { label: "Open Coverage", value: `${openShifts}` },
    { label: "Pending Items", value: `${pendingAcks + expiringCerts}` },
    { label: isAdmin ? "Admin" : "Employee", value: role },
  ];

  return (
    <header className="lounge-hero">
      <div className="lounge-hero-copy">
        <div className="lounge-eyebrow">{formatDateLine(now)}</div>
        <div className="lounge-hero-title-row">
          <h1>Employee Lounge</h1>
          <p>Welcome back, {firstName}. Shift notes, coverage, messages, and crew tools.</p>
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

function QuickActionDock({ isAdmin }: { isAdmin: boolean }) {
  const actions = isAdmin ? [...quickActions, ...adminActions] : quickActions;
  return (
    <section className="lounge-action-dock" aria-label="Quick actions">
      <div className="lounge-section-head">
        <span>Quick actions</span>
        <h2>Shift tasks</h2>
      </div>
      <div className="lounge-action-grid">
        {actions.map((action) => (
          <Link key={action.href + action.label} href={action.href} className="lounge-action-card">
            <Icon name={action.icon} />
            <span>{action.label}</span>
            <small>{action.detail}</small>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ScheduleSnapshot({ openShifts }: { openShifts: OpenShift[] }) {
  const preview = openShifts.slice(0, 3);
  return (
    <section className="lounge-schedule" id="schedule">
      <div className="lounge-section-head">
        <span>Schedule snapshot</span>
        <h2>Coverage</h2>
      </div>

      <div className="lounge-schedule-grid">
        <div className="lounge-unit-board">
          <StatusRow label="Today" value="Use Aladtec for official roster" tone="blue" />
          <StatusRow label="Unit staffing" value="Schedule sync not connected yet" tone="gold" />
          <StatusRow label="Next shift" value="Private schedule stays in Aladtec" tone="neutral" />
        </div>

        <div className="lounge-open-board">
          <div className="lounge-open-top">
            <div>
              <span>Open Coverage</span>
              <strong>{openShifts.length} active</strong>
            </div>
            <Link href="/lounge/open-shifts">Open board</Link>
          </div>
          {preview.length === 0 ? (
            <p className="lounge-empty">No open shifts posted right now.</p>
          ) : (
            <div className="lounge-shift-list">
              {preview.map((shift) => (
                <article key={shift.id}>
                  <span>{shift.target || "All crew"}</span>
                  <strong>{shift.title}</strong>
                  <p>{shift.body}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TrainingResourcesRecognition({ isAdmin }: { isAdmin: boolean }) {
  return (
    <section className="lounge-panels-row">
      <DashboardPanel eyebrow="Training Center" title="Education and compliance">
        <div className="lounge-list">
          {trainingItems.map((item) => (
            <Link key={item.title} href={item.href}>
              <span>{item.title}</span>
              <strong>{item.status}</strong>
            </Link>
          ))}
        </div>
      </DashboardPanel>

      <DashboardPanel eyebrow="Station Resources" title="Forms, tools, and links" id="resources">
        <div className="lounge-resource-grid">
          {resourceItems.map((item) => (
            <Link key={item.title} href={item.href}>
              <span>{item.label}</span>
              <strong>{item.title}</strong>
            </Link>
          ))}
        </div>
      </DashboardPanel>

      <DashboardPanel eyebrow="Recognition Wall" title="Crew wins">
        <div className="lounge-recognition">
          {recognitions.map((item) => (
            <article key={item.type}>
              <span>{item.type}</span>
              <strong>{item.name}</strong>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
        {isAdmin && (
          <Link href="/lounge" className="lounge-admin-note">
            Post recognition through the Wall composer
          </Link>
        )}
      </DashboardPanel>
    </section>
  );
}

function CommandRail({
  pendingAcks,
  openShifts,
  expiring,
  latestNotice,
  isAdmin,
}: {
  pendingAcks: Ack[];
  openShifts: OpenShift[];
  expiring: EmployeeCert[];
  latestNotice: Ack | null;
  isAdmin: boolean;
}) {
  return (
    <aside className="lounge-command-rail">
      <RailCard title="At a glance">
        <RailMetric label="Pending acknowledgments" value={pendingAcks.length} href="/lounge/acks" />
        <RailMetric label="Open shifts" value={openShifts.length} href="/lounge/open-shifts" />
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

      <RailCard title="Issue reporting">
        <p>Submit unit, equipment, supply, building, IT, uniform, or safety concerns through the report form.</p>
        <Link href="/lounge/incidents" className="lounge-rail-button">New report</Link>
      </RailCard>

      {isAdmin && (
        <RailCard title="Admin controls">
          <div className="lounge-admin-links">
            <Link href="/admin/calls">Ticker editor</Link>
            <Link href="/lounge/acks">Create notice</Link>
            <Link href="/lounge/open-shifts">Post open shift</Link>
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

function DashboardPanel({
  eyebrow,
  title,
  id,
  children,
}: {
  eyebrow: string;
  title: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <article className="lounge-dashboard-panel" id={id}>
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      {children}
    </article>
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

function StatusRow({ label, value, tone }: { label: string; value: string; tone: "blue" | "gold" | "neutral" }) {
  return (
    <div className={`lounge-status-row is-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    calendar: <path d="M7 2h2v2h6V2h2v2h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3V2Zm13 8H4v10h16V10Z" />,
    plus: <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" />,
    ambulance: <path d="M3 6h10v10H3V6Zm12 3h3l3 4v3h-2a3 3 0 0 1-6 0h-3a3 3 0 0 1-6 0H2V4h13v5Zm-8 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm1-6h-2v2h3.5L17 11ZM8 8h2v2h2v2h-2v2H8v-2H6v-2h2V8Z" />,
    tool: <path d="M22 19.6 19.6 22l-6.8-6.8a6.5 6.5 0 0 1-8.1-8.1l4.2 4.2 2.4-2.4-4.2-4.2a6.5 6.5 0 0 1 8.1 8.1L22 19.6Z" />,
    upload: <path d="M11 16h2V8l3.5 3.5 1.4-1.4L12 4.2 6.1 10.1l1.4 1.4L11 8v8Zm-7 2h16v2H4v-2Z" />,
    file: <path d="M6 2h8l4 4v16H6V2Zm7 1.5V7h3.5L13 3.5ZM8 12h8v2H8v-2Zm0 4h8v2H8v-2Z" />,
    check: <path d="m9.2 16.2-4.1-4.1-1.4 1.4 5.5 5.5L21 7.2l-1.4-1.4L9.2 16.2Z" />,
    message: <path d="M4 4h16v12H7.8L4 19.8V4Zm2 2v9l1-1h11V6H6Z" />,
    ticker: <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 2v10h16V7H4Zm2 3h5v2H6v-2Zm7 0h5v2h-5v-2Zm-7 4h8v2H6v-2Z" />,
    users: <path d="M8 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm8 1a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7ZM2 21v-2a5 5 0 0 1 10 0v2H2Zm11 0v-1.5a6.8 6.8 0 0 0-1.2-3.9A4.8 4.8 0 0 1 21 17.5V21h-8Z" />,
    shield: <path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm-1 14-3.3-3.3 1.4-1.4 1.9 1.9 4.9-4.9 1.4 1.4L11 16Z" />,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      {paths[name] ?? paths.file}
    </svg>
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
.lounge-section-head span,
.lounge-dashboard-panel > span,
.lounge-cert-banner span,
.lounge-open-top span,
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
.lounge-action-card small,
.lounge-status-row span,
.lounge-resource-grid span,
.lounge-recognition span,
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
.lounge-open-top a,
.lounge-rail-button,
.lounge-admin-note {
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
.lounge-action-dock,
.lounge-schedule,
.lounge-dashboard-panel,
.lounge-rail-card {
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(37,99,235,0.08), transparent),
    #071428;
  box-shadow: 0 12px 34px rgba(0,0,0,0.2);
}
.lounge-action-dock {
  padding: 14px;
}
.lounge-section-head {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 16px;
  margin-bottom: 10px;
}
.lounge-section-head h2,
.lounge-dashboard-panel h2,
.lounge-rail-card h3 {
  margin: 5px 0 0;
  color: white;
  font-size: 1.08rem;
  line-height: 1.1;
  letter-spacing: -0.025em;
}
.lounge-action-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.lounge-action-card {
  min-height: 72px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 14px;
  text-decoration: none;
  background: rgba(255,255,255,0.045);
  border: 1px solid rgba(255,255,255,0.08);
  transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
}
.lounge-action-card:hover,
.lounge-action-card:focus {
  transform: translateY(-2px);
  border-color: rgba(240,180,41,0.45);
  background: rgba(240,180,41,0.08);
}
.lounge-action-card svg {
  width: 24px;
  height: 24px;
  fill: #f0b429;
  flex: 0 0 auto;
}
.lounge-action-card span {
  color: white;
  font-size: 0.86rem;
  font-weight: 900;
  line-height: 1.15;
}
.lounge-action-card small {
  display: none;
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
.lounge-schedule {
  padding: 14px;
}
.lounge-schedule-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 10px;
}
.lounge-unit-board,
.lounge-open-board {
  display: grid;
  gap: 10px;
}
.lounge-status-row,
.lounge-open-board,
.lounge-rail-metric,
.lounge-notice-link,
.lounge-list a,
.lounge-resource-grid a,
.lounge-recognition article {
  border-radius: 16px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
}
.lounge-status-row {
  padding: 12px;
  border-left: 4px solid #64748b;
}
.lounge-status-row.is-blue { border-left-color: #38bdf8; }
.lounge-status-row.is-gold { border-left-color: #f0b429; }
.lounge-status-row strong {
  display: block;
  margin-top: 6px;
  color: white;
  font-size: 0.86rem;
  line-height: 1.4;
}
.lounge-open-board {
  padding: 12px;
}
.lounge-open-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.lounge-open-top strong {
  display: block;
  margin-top: 4px;
  color: white;
  font-size: 1.16rem;
}
.lounge-empty {
  margin: 12px 0 0;
  color: #94a3b8;
  font-size: 0.9rem;
  line-height: 1.55;
}
.lounge-shift-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}
.lounge-shift-list article {
  padding: 12px;
  border-radius: 14px;
  background: rgba(2,9,18,0.5);
}
.lounge-shift-list span {
  color: #7dd3fc;
  font-size: 0.68rem;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
.lounge-shift-list strong {
  display: block;
  margin-top: 4px;
  color: white;
}
.lounge-shift-list p {
  display: -webkit-box;
  margin: 5px 0 0;
  color: #94a3b8;
  font-size: 0.82rem;
  line-height: 1.45;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.lounge-panels-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.lounge-dashboard-panel {
  padding: 14px;
}
.lounge-list,
.lounge-resource-grid,
.lounge-recognition {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}
.lounge-list a,
.lounge-resource-grid a {
  display: block;
  padding: 11px;
  text-decoration: none;
}
.lounge-list span,
.lounge-resource-grid strong,
.lounge-list strong,
.lounge-recognition strong {
  display: block;
}
.lounge-list span,
.lounge-resource-grid strong {
  color: white;
  font-weight: 850;
}
.lounge-list strong,
.lounge-resource-grid span {
  margin-top: 4px;
  color: #f0b429;
}
.lounge-recognition article {
  padding: 11px;
}
.lounge-recognition strong {
  margin-top: 4px;
  color: white;
}
.lounge-recognition p,
.lounge-rail-card p {
  margin: 7px 0 0;
  color: #94a3b8;
  font-size: 0.84rem;
  line-height: 1.55;
}
.lounge-admin-note {
  width: 100%;
  margin-top: 12px;
}
.lounge-command-rail {
  position: sticky;
  top: 14px;
  display: grid;
  gap: 10px;
}
.lounge-rail-card {
  padding: 14px;
}
.lounge-rail-metric {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  text-decoration: none;
}
.lounge-rail-metric + .lounge-rail-metric {
  margin-top: 8px;
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
  .lounge-hero,
  .lounge-schedule-grid,
  .lounge-panels-row {
    grid-template-columns: 1fr;
  }
  .lounge-command-rail {
    position: static;
  }
}
@media (max-width: 760px) {
  .lounge-hero,
  .lounge-action-dock,
  .lounge-schedule,
  .lounge-dashboard-panel,
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
  .lounge-action-grid,
  .lounge-cert-banner {
    grid-template-columns: 1fr;
  }
  .lounge-action-card {
    min-height: 96px;
  }
  .lounge-section-head {
    display: block;
  }
}
`;
