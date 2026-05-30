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
import BirthdayBanner from "@/components/lounge/BirthdayBanner";
import PollsWidget from "@/components/lounge/PollsWidget";
import { listTodaysBirthdays } from "@/lib/lounge/birthdays";
import WelcomeOverlay from "@/components/lounge/WelcomeOverlay";
import CoffeePrankOverlay from "@/components/lounge/CoffeePrankOverlay";

const PRANK_USERNAMES = new Set(["kwetzel", "jgoetz"]);

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
  const blockingCerts = expiring.filter((c) => c.status === "expired" || c.status === "final_7");

  return (
    <LoungeShell me={me}>
      <style>{LANDING_CSS}</style>
      <BirthdayBanner people={birthdays} />
      <PasskeyPrompt />

      <div className="mas-home">
        <HomeHero
          firstName={session.firstName}
          rank={emp?.position ?? emp?.certification ?? "Crew"}
          pendingAcks={pendingAcks.length}
          accessLabel={session.isAdmin ? "Admin" : "User"}
        />

        {blockingCerts.length > 0 && <CertAlertsBanner certs={expiring} />}

        <div className="mas-home-grid">
          <div className="mas-home-main">
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

          <aside className="mas-home-rail">
            <AtAGlanceCard pendingAcks={pendingAcks.length} dueCerts={expiring.length} />
            <LatestNoticeCard notice={latestNotice} />
            <PollsWidget />
            {session.isAdmin && <AdminQuickCard />}
          </aside>
        </div>
      </div>

      {PRANK_USERNAMES.has(session.username)
        ? <CoffeePrankOverlay name={session.firstName} />
        : <WelcomeOverlay name={session.firstName} customImage={welcomeOverrideFor(session.username)} />}
    </LoungeShell>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────
function HomeHero({
  firstName,
  rank,
  pendingAcks,
  accessLabel,
}: {
  firstName: string;
  rank: string;
  pendingAcks: number;
  accessLabel: string;
}) {
  const now = new Date();
  const dateLine = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="mas-hero">
      <Image
        src="/lounge/brand/hero-3926.jpg"
        alt=""
        fill
        sizes="(max-width: 900px) 100vw, 1200px"
        priority
        className="mas-hero-photo"
      />
      <div className="mas-hero-veil" aria-hidden />
      <div className="mas-hero-tint" aria-hidden />
      <div className="mas-hero-copy">
        <span className="mas-hero-eyebrow">{dateLine} · Millstadt EMS</span>
        <h1 className="mas-hero-title">
          On duty, {firstName}.
        </h1>
        <p className="mas-hero-sub">
          The station wall, shift events, and crew tools.
        </p>
        <dl className="mas-hero-meta">
          <div>
            <dt>Pending</dt>
            <dd className={pendingAcks > 0 ? "is-warn" : ""}>
              <span className="mas-numeric">{pendingAcks}</span>
            </dd>
          </div>
          <div>
            <dt>Rank</dt>
            <dd>{rank}</dd>
          </div>
          <div>
            <dt>Access</dt>
            <dd>{accessLabel}</dd>
          </div>
        </dl>
      </div>
    </header>
  );
}

// ── Cert banner ──────────────────────────────────────────────────────────
function CertAlertsBanner({ certs }: { certs: EmployeeCert[] }) {
  const expired = certs.filter((c) => c.status === "expired");
  const final7 = certs.filter((c) => c.status === "final_7");
  const blocking = expired.length > 0;

  return (
    <section className={blocking ? "mas-cert-strip is-critical" : "mas-cert-strip is-warn"}>
      <div className="mas-cert-strip-head">
        <span className="mas-cert-strip-kicker">
          {blocking ? "Action required" : "Heads up"}
        </span>
        <h2 className="mas-cert-strip-title">
          {blocking
            ? `${expired.length} ${expired.length === 1 ? "credential is" : "credentials are"} expired.`
            : `${final7.length} ${final7.length === 1 ? "credential expires" : "credentials expire"} this week.`}
        </h2>
      </div>
      <ul className="mas-cert-strip-list">
        {[...expired, ...final7].slice(0, 3).map((cert) => (
          <li key={cert.id}>
            <span>{cert.certTypeName}</span>
            <span className="mas-numeric">
              {cert.status === "expired" ? "Expired" : cert.daysLeft === 0 ? "Today" : `${cert.daysLeft}d`}
            </span>
          </li>
        ))}
      </ul>
      <Link href="/lounge/certs" className="mas-cert-strip-cta">
        Open certifications
      </Link>
    </section>
  );
}

// ── Sidebar widgets ──────────────────────────────────────────────────────
function AtAGlanceCard({ pendingAcks, dueCerts }: { pendingAcks: number; dueCerts: number }) {
  return (
    <RailCard title="Today">
      <RailMetric label="Pending acknowledgments" value={pendingAcks} href="/lounge/acks" tone={pendingAcks > 0 ? "warn" : "neutral"} />
      <RailMetric label="Credentials due" value={dueCerts} href="/lounge/certs" tone={dueCerts > 0 ? "warn" : "neutral"} />
    </RailCard>
  );
}

function LatestNoticeCard({ notice }: { notice: Ack | null }) {
  return (
    <RailCard title="Pinned notice">
      {notice ? (
        <Link href="/lounge/acks" className="mas-rail-notice">
          <span className="mas-rail-notice-cat">{notice.category}</span>
          <strong>{notice.title}</strong>
          <small>{timeAgo(notice.createdAt)}</small>
        </Link>
      ) : (
        <p className="mas-rail-empty">No notices posted.</p>
      )}
    </RailCard>
  );
}

function AdminQuickCard() {
  return (
    <RailCard title="Admin">
      <div className="mas-rail-admin">
        <Link href="/admin/calls">Ticker editor</Link>
        <Link href="/lounge/acks">Post a notice</Link>
        <Link href="/admin/employees">Employee records</Link>
        <Link href="/admin/polls">Polls &amp; surveys</Link>
      </div>
    </RailCard>
  );
}

function RailCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mas-rail-card">
      <h3 className="mas-rail-card-title">{title}</h3>
      {children}
    </section>
  );
}

function RailMetric({
  label,
  value,
  href,
  tone = "neutral",
}: {
  label: string;
  value: number;
  href: string;
  tone?: "neutral" | "warn";
}) {
  return (
    <Link href={href} className={`mas-rail-metric tone-${tone}`}>
      <span>{label}</span>
      <strong className="mas-numeric">{value}</strong>
    </Link>
  );
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

// ── CSS ──────────────────────────────────────────────────────────────────
const LANDING_CSS = `
.mas-home {
  display: grid;
  gap: var(--mas-s-5);
}

/* ── Hero ─────────────────────────────────────────────────────────── */
.mas-hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border-radius: var(--mas-r-4);
  border: 1px solid var(--mas-border);
  background: var(--mas-surface);
  min-height: 280px;
  box-shadow: var(--mas-shadow-3);
  animation: mas-rise var(--mas-base) var(--mas-ease-out) both;
}
.mas-hero-photo {
  object-fit: cover;
  object-position: center 40%;
  filter: saturate(0.95);
}
.mas-hero-veil {
  position: absolute; inset: 0;
  background:
    linear-gradient(95deg, rgba(4,13,26,0.94) 0%, rgba(4,13,26,0.68) 45%, rgba(4,13,26,0.05) 78%);
}
.mas-hero-tint {
  position: absolute; left: 0; right: 0; bottom: 0; height: 2px;
  background: linear-gradient(90deg, var(--mas-brand-gold), transparent 60%);
}
.mas-hero-copy {
  position: relative;
  z-index: 1;
  padding: var(--mas-s-7) var(--mas-s-7) var(--mas-s-6);
  display: grid;
  gap: var(--mas-s-3);
  max-width: 680px;
}
.mas-hero-eyebrow {
  color: var(--mas-brand-gold);
  font-family: var(--mas-font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 600;
}
.mas-hero-title {
  margin: 0;
  font-size: clamp(2.2rem, 4.4vw, 3.4rem);
  line-height: 1.04;
  letter-spacing: -0.02em;
  font-weight: 700;
  color: var(--mas-ink);
}
.mas-hero-sub {
  margin: 0;
  color: var(--mas-ink-muted);
  font-size: 0.98rem;
  line-height: 1.55;
  max-width: 46ch;
}
.mas-hero-meta {
  margin: var(--mas-s-3) 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, max-content);
  gap: var(--mas-s-2);
}
.mas-hero-meta div {
  min-width: 112px;
  display: grid;
  gap: 2px;
  padding: 10px 16px;
  border-radius: var(--mas-r-pill);
  background: rgba(2, 9, 18, 0.58);
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
}
.mas-hero-meta dt {
  color: var(--mas-ink-soft);
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-weight: 600;
  font-family: var(--mas-font-mono);
}
.mas-hero-meta dd {
  margin: 0;
  color: var(--mas-ink);
  font-size: 0.92rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mas-hero-meta dd.is-warn { color: var(--mas-warn); }

/* ── Cert alert strip ─────────────────────────────────────────────── */
.mas-cert-strip {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--mas-s-4);
  padding: var(--mas-s-4) var(--mas-s-5);
  border-radius: var(--mas-r-3);
  border: 1px solid var(--mas-border);
  background: var(--mas-surface-1);
  position: relative;
  overflow: hidden;
}
.mas-cert-strip::before {
  content: "";
  position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: currentColor;
}
.mas-cert-strip.is-warn { color: var(--mas-warn); }
.mas-cert-strip.is-critical { color: var(--mas-critical); }
.mas-cert-strip-head { color: var(--mas-ink); }
.mas-cert-strip-kicker {
  color: currentColor;
  font-family: var(--mas-font-mono);
  font-size: 10.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 600;
}
.mas-cert-strip-title {
  margin: 4px 0 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--mas-ink);
  letter-spacing: -0.01em;
}
.mas-cert-strip-list {
  margin: 0; padding: 0; list-style: none;
  display: grid; gap: 6px;
}
.mas-cert-strip-list li {
  display: flex; justify-content: space-between; gap: 12px;
  color: var(--mas-ink-muted);
  font-size: 0.85rem;
}
.mas-cert-strip-list li .mas-numeric { color: currentColor; }
.mas-cert-strip-cta {
  display: inline-flex; align-items: center; height: 36px;
  padding: 0 var(--mas-s-4);
  border-radius: var(--mas-r-pill);
  background: var(--mas-brand-gold);
  color: var(--mas-ink-on-light);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  transition: transform var(--mas-fast) var(--mas-ease), filter var(--mas-fast) var(--mas-ease);
}
.mas-cert-strip-cta:hover { transform: translateY(-1px); filter: brightness(1.06); }

/* ── Main grid (Wall + sidebar) ──────────────────────────────────── */
.mas-home-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: var(--mas-s-5);
  align-items: start;
}
.mas-home-main { min-width: 0; display: grid; gap: var(--mas-s-4); }
.mas-home-rail {
  position: sticky; top: var(--mas-s-4);
  display: grid; gap: var(--mas-s-3);
  align-self: start;
}

/* ── Rail cards ───────────────────────────────────────────────────── */
.mas-rail-card {
  border-radius: var(--mas-r-3);
  border: 1px solid var(--mas-border);
  background: var(--mas-surface-1);
  padding: var(--mas-s-4) var(--mas-s-5) var(--mas-s-5);
  box-shadow: var(--mas-shadow-1);
  animation: mas-rise var(--mas-base) var(--mas-ease-out) both;
}
.mas-rail-card-title {
  margin: 0 0 var(--mas-s-3);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mas-ink-soft);
  font-family: var(--mas-font-mono);
  font-weight: 600;
}
.mas-rail-metric {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 14px;
  border-radius: var(--mas-r-2);
  background: var(--mas-surface-well);
  border: 1px solid var(--mas-border);
  text-decoration: none;
  transition: border-color var(--mas-fast) var(--mas-ease), background var(--mas-fast) var(--mas-ease);
}
.mas-rail-metric + .mas-rail-metric { margin-top: var(--mas-s-2); }
.mas-rail-metric:hover {
  border-color: var(--mas-border-strong);
  background: rgba(255,255,255,0.02);
}
.mas-rail-metric span {
  color: var(--mas-ink-muted);
  font-size: 0.82rem;
  font-weight: 500;
}
.mas-rail-metric strong {
  color: var(--mas-ink);
  font-size: 1.4rem;
  font-weight: 600;
  line-height: 1;
}
.mas-rail-metric.tone-warn strong { color: var(--mas-warn); }
.mas-rail-notice {
  display: grid; gap: 6px;
  padding: 12px 14px;
  border-radius: var(--mas-r-2);
  background: var(--mas-surface-well);
  border: 1px solid var(--mas-border);
  text-decoration: none;
  transition: border-color var(--mas-fast) var(--mas-ease);
}
.mas-rail-notice:hover { border-color: var(--mas-border-strong); }
.mas-rail-notice-cat {
  color: var(--mas-brand-gold);
  font-family: var(--mas-font-mono);
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-weight: 600;
}
.mas-rail-notice strong {
  color: var(--mas-ink);
  font-size: 0.94rem;
  line-height: 1.3;
  font-weight: 600;
}
.mas-rail-notice small {
  color: var(--mas-ink-soft);
  font-size: 0.78rem;
  font-family: var(--mas-font-mono);
}
.mas-rail-empty {
  margin: 0;
  color: var(--mas-ink-soft);
  font-size: 0.88rem;
  line-height: 1.5;
}
.mas-rail-admin { display: grid; gap: var(--mas-s-1); }
.mas-rail-admin a {
  display: block;
  padding: 8px 12px;
  border-radius: var(--mas-r-1);
  color: var(--mas-ink-muted);
  font-size: 0.9rem;
  font-weight: 500;
  text-decoration: none;
  transition: background var(--mas-fast) var(--mas-ease), color var(--mas-fast) var(--mas-ease);
}
.mas-rail-admin a:hover {
  background: var(--mas-surface-well);
  color: var(--mas-brand-gold);
}

/* ── Motion ───────────────────────────────────────────────────────── */
@keyframes mas-rise {
  from { opacity: 0; transform: translate3d(0, 8px, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
}
.mas-home-main > * { animation: mas-rise var(--mas-base) var(--mas-ease-out) both; }
.mas-home-rail > * { animation: mas-rise var(--mas-base) var(--mas-ease-out) both; }
.mas-home-rail > *:nth-child(2) { animation-delay: 60ms; }
.mas-home-rail > *:nth-child(3) { animation-delay: 120ms; }
.mas-home-rail > *:nth-child(4) { animation-delay: 180ms; }

/* ── Responsive ───────────────────────────────────────────────────── */
@media (max-width: 1100px) {
  .mas-home-grid { grid-template-columns: 1fr; }
  .mas-home-rail { position: static; }
}
@media (max-width: 760px) {
  .mas-hero { min-height: 220px; }
  .mas-hero-copy { padding: var(--mas-s-5) var(--mas-s-5) var(--mas-s-4); }
  .mas-hero-veil {
    background: linear-gradient(180deg, rgba(4,13,26,0.85) 35%, rgba(4,13,26,0.92) 100%);
  }
  .mas-hero-meta {
    grid-template-columns: minmax(0, 0.72fr) minmax(0, 1.12fr) minmax(0, 0.72fr);
    gap: 8px;
  }
  .mas-hero-meta div {
    min-width: 0;
    padding: 9px 10px;
  }
  .mas-hero-meta dt {
    font-size: 9.5px;
    letter-spacing: 0.12em;
  }
  .mas-hero-meta dd {
    font-size: 0.84rem;
  }
  .mas-cert-strip { grid-template-columns: 1fr; }
  .mas-cert-strip-cta { justify-self: start; }
}
`;
