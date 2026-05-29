"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ACTIVITY_TAGS,
  AGE_TRACKS,
  BADGES,
  KIDS_ACTIVITIES,
  MONTHLY_FEATURED_SLUGS,
  MONTH_NAMES,
  type KidsActivity,
  type KidsAgeTrack,
} from "@/lib/kids/activities";

type AgeFilter = "All" | KidsAgeTrack;
type ThemeFilter = "All" | string;

export default function KidsClubActivitiesPage() {
  const currentMonth = new Date().getMonth();
  const featured =
    KIDS_ACTIVITIES.find((activity) => activity.slug === MONTHLY_FEATURED_SLUGS[currentMonth]) ??
    KIDS_ACTIVITIES[0];
  const [ageFilter, setAgeFilter] = useState<AgeFilter>("All");
  const [themeFilter, setThemeFilter] = useState<ThemeFilter>("All");

  const filteredActivities = useMemo(() => {
    return KIDS_ACTIVITIES.filter((activity) => {
      const ageMatches = ageFilter === "All" || activity.ageTrack === ageFilter;
      const themeMatches = themeFilter === "All" || activity.tags.includes(themeFilter);
      return ageMatches && themeMatches;
    });
  }, [ageFilter, themeFilter]);

  return (
    <main className="kids-activities-page">
      <style>{KIDS_ACTIVITY_CSS}</style>

      <section className="kc-hero">
        <Image
          src="/images/millstadt-ems/pr.jpg"
          alt="Millstadt EMS visiting with local kids"
          fill
          priority
          sizes="100vw"
          className="kc-hero-photo"
        />
        <div className="kc-hero-wash" />
        <div className="kc-hero-grid" />

        <div className="kc-wrap kc-hero-inner">
          <Link href="/kids-club" className="kc-back-link">
            Back to Kids Club
          </Link>

          <div className="kc-hero-copy">
            <div className="kc-kicker">Millstadt EMS Kids Club</div>
            <h1>Safety Missions</h1>
            <p>
              A colorful, parent-assisted activity board where local kids learn
              real EMS safety skills without making emergencies feel scary.
            </p>
            <div className="kc-hero-actions">
              <a href="#missions" className="kc-primary-action">Explore Activities</a>
              <Link href="/kids-club/printables" className="kc-secondary-action">Print Safety Missions</Link>
              <a href="#badges" className="kc-secondary-action">Earn Badges</a>
            </div>
          </div>

          <aside className="kc-hero-console" aria-label="Kids Club mission stats">
            <div className="kc-console-top">
              <Image
                src="/images/millstadt-ems/star-of-life.png"
                alt=""
                width={64}
                height={64}
              />
              <div>
                <span>Mission Control</span>
                <strong>{MONTH_NAMES[currentMonth]} spotlight</strong>
              </div>
            </div>
            <div className="kc-console-stats">
              <div><strong>24</strong><span>missions</span></div>
              <div><strong>2</strong><span>age tracks</span></div>
              <div><strong>{ACTIVITY_TAGS.length}</strong><span>safety themes</span></div>
            </div>
            <div className="kc-console-callout">
              <span>Featured now</span>
              <strong>{featured.title}</strong>
            </div>
          </aside>
        </div>
      </section>

      <section className="kc-spotlight-section" id="featured">
        <div className="kc-wrap">
          <div className="kc-section-heading">
            <span>This Month's Mission</span>
            <h2>{MONTH_NAMES[currentMonth]} safety spotlight</h2>
            <p>
              One highlighted mission gives families a simple place to start.
              The full library stays available below for any age and theme.
            </p>
          </div>

          <article className="kc-spotlight">
            <div className="kc-spotlight-art">
              <Image
                src={featured.image}
                alt=""
                fill
                sizes="(max-width: 900px) 100vw, 48vw"
                className="kc-spotlight-img"
              />
              <div className="kc-art-badge">{featured.badge}</div>
            </div>
            <div className="kc-spotlight-copy">
              <div className="kc-card-meta">
                <span>Mission {featured.id}</span>
                <span>{featured.ageTrack}</span>
                <span>{featured.time}</span>
              </div>
              <h3>{featured.title}</h3>
              <p>{featured.summary}</p>
              <div className="kc-learn-panel">
                <span>What kids learn</span>
                <strong>{featured.learn}</strong>
              </div>
              <div className="kc-mini-grid">
                <InfoTile label="Grown-up help" value={featured.helpLevel} />
                <InfoTile label="Supplies" value={`${featured.supplies.length} simple items`} />
              </div>
              <div className="kc-supply-row">
                {featured.supplies.map((supply) => (
                  <span key={supply}>{supply}</span>
                ))}
              </div>
              <div className="kc-spotlight-actions">
                <a href={`#${featured.slug}`} className="kc-primary-action">Open Mission</a>
                {featured.printable && (
                  <a href={featured.printable.href} target="_blank" rel="noopener noreferrer" className="kc-secondary-action">
                    {featured.printable.label}
                  </a>
                )}
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="kc-browse-section" id="missions">
        <div className="kc-wrap">
          <div className="kc-filter-panel">
            <div>
              <span className="kc-panel-label">Browse by age track</span>
              <div className="kc-filter-row" role="tablist" aria-label="Age track filter">
                {(["All", ...AGE_TRACKS] as AgeFilter[]).map((age) => (
                  <button
                    key={age}
                    type="button"
                    className={ageFilter === age ? "is-active" : ""}
                    onClick={() => setAgeFilter(age)}
                  >
                    {age === "All" ? "All Ages" : age}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="kc-panel-label">Filter by safety theme</span>
              <div className="kc-theme-row" aria-label="Safety theme filter">
                {(["All", ...ACTIVITY_TAGS] as ThemeFilter[]).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={themeFilter === tag ? "is-active" : ""}
                    onClick={() => setThemeFilter(tag)}
                  >
                    {tag === "All" ? "All Themes" : tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="kc-filter-summary">
            Showing <strong>{filteredActivities.length}</strong> safety mission
            {filteredActivities.length === 1 ? "" : "s"}
          </div>

          {AGE_TRACKS.map((track) => {
            const trackActivities = filteredActivities.filter((activity) => activity.ageTrack === track);
            if (trackActivities.length === 0) return null;
            const trackHeadingId = `${track.toLowerCase().replaceAll(" ", "-")}-heading`;
            return (
              <section key={track} className="kc-age-track" aria-labelledby={trackHeadingId}>
                <div className="kc-track-heading">
                  <span>{track}</span>
                  <h2 id={trackHeadingId}>
                    {track === "Ages 2-5" ? "Little helper missions" : "Junior responder missions"}
                  </h2>
                  <p>
                    {track === "Ages 2-5"
                      ? "Short, grown-up led activities built around recognition, routines, and calm helper language."
                      : "More structured challenges for older kids who can practice scripts, checklists, and simple decision skills."}
                  </p>
                </div>

                <div className="kc-card-grid">
                  {trackActivities.map((activity) => (
                    <MissionCard key={activity.slug} activity={activity} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <section className="kc-lower-section">
        <div className="kc-wrap kc-lower-grid">
          <article className="kc-printable-callout">
            <div className="kc-callout-copy">
              <span>Printable Library</span>
              <h2>Coloring pages, checklists, and station-ready mission sheets.</h2>
              <p>
                Keep the hands-on side easy: print a Millstadt EMS coloring page,
                finish a mission, and bring it by the station or a community event.
              </p>
              <Link href="/kids-club/printables" className="kc-primary-action">Open Printables</Link>
            </div>
            <div className="kc-print-stack" aria-hidden>
              <Image src="/kids-club/coloring/kids-club-logo.png" alt="" width={340} height={255} />
              <Image src="/kids-club/coloring/ambulance-water-tower.png" alt="" width={340} height={255} />
            </div>
          </article>

          <aside className="kc-badge-tracker" id="badges">
            <span>Mission Tracker</span>
            <h2>Printable badge goals</h2>
            <p>Use these as completion rewards after a child finishes a mission with a grown-up.</p>
            <div className="kc-badge-grid">
              {BADGES.map((badge) => (
                <div key={badge}>
                  <StarIcon />
                  <strong>{badge}</strong>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="kc-parent-section">
        <div className="kc-wrap kc-parent-grid">
          <div>
            <span className="kc-panel-label">For parents and caregivers</span>
            <h2>Teach safety without making it scary.</h2>
          </div>
          <div className="kc-parent-notes">
            <p>
              Ages 2-5 should focus on recognition, simple words, trusted adults,
              and calm routines. Keep practice short and upbeat.
            </p>
            <p>
              Ages 6-11 can handle scripts, maps, checklists, and more specific
              safety decisions. Keep it practical and repeatable.
            </p>
            <p>
              These activities support family safety conversations. They do not
              replace first aid training, medical advice, or calling 911 during
              a real emergency.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function MissionCard({ activity }: { activity: KidsActivity }) {
  return (
    <article className="kc-mission-card" data-accent={activity.accent} id={activity.slug}>
      <header>
        <div className="kc-number-badge">{activity.id}</div>
        <div>
          <span className="kc-mission-type">Safety Mission</span>
          <h3>{activity.title}</h3>
        </div>
        <span className="kc-age-chip">{activity.ageTrack}</span>
      </header>

      <div className="kc-card-body">
        <p>{activity.summary}</p>
        <div className="kc-learn-card">
          <span>What kids learn</span>
          <strong>{activity.learn}</strong>
        </div>

        <div className="kc-detail-row">
          <InfoTile label="Help level" value={activity.helpLevel} />
          <InfoTile label="Time" value={activity.time} />
        </div>

        <div className="kc-supplies">
          <span>Supplies</span>
          <div>
            {activity.supplies.map((supply) => (
              <em key={supply}>{supply}</em>
            ))}
          </div>
        </div>

        <div className="kc-steps">
          <span>Steps</span>
          <ol>
            {activity.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        <div className="kc-note">
          <strong>Grown-up note</strong>
          <span>{activity.safetyNote}</span>
        </div>
      </div>

      <footer>
        <div className="kc-tag-row">
          {activity.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <div className="kc-card-actions">
          <span className="kc-complete-badge">{activity.badge}</span>
          {activity.printable && (
            <a href={activity.printable.href} target="_blank" rel="noopener noreferrer">
              {activity.printable.label}
            </a>
          )}
        </div>
      </footer>
    </article>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="kc-info-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2.4l2.9 6 6.6.9-4.8 4.7 1.1 6.6-5.8-3.1-5.9 3.1 1.1-6.6-4.7-4.7 6.6-.9L12 2.4z" />
    </svg>
  );
}

const KIDS_ACTIVITY_CSS = `
.kids-activities-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 12% 18%, rgba(34, 211, 238, 0.18), transparent 28rem),
    radial-gradient(circle at 88% 8%, rgba(240, 180, 41, 0.18), transparent 24rem),
    linear-gradient(180deg, #041326 0%, #eef6fb 36%, #f7fbff 100%);
  color: #061121;
  overflow: hidden;
}
.kc-wrap {
  width: min(100% - 32px, 1240px);
  margin: 0 auto;
}
.kc-hero {
  position: relative;
  min-height: 680px;
  background: #030914;
  color: white;
  isolation: isolate;
}
.kc-hero-photo {
  object-fit: cover;
  object-position: 52% 44%;
  opacity: 0.64;
}
.kc-hero-wash,
.kc-hero-grid {
  position: absolute;
  inset: 0;
  z-index: 1;
}
.kc-hero-wash {
  background:
    radial-gradient(circle at 22% 20%, rgba(34, 211, 238, 0.34), transparent 23rem),
    radial-gradient(circle at 78% 22%, rgba(240, 180, 41, 0.3), transparent 22rem),
    linear-gradient(90deg, rgba(3,9,20,0.98) 0%, rgba(3,9,20,0.86) 42%, rgba(3,9,20,0.72) 100%),
    linear-gradient(180deg, rgba(3,9,20,0.04) 0%, #041326 100%);
}
.kc-hero-grid {
  opacity: 0.24;
  background-image:
    linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: linear-gradient(180deg, black 0%, transparent 85%);
}
.kc-hero-inner {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 390px;
  align-items: center;
  gap: 48px;
  min-height: 680px;
  padding: 56px 0 72px;
}
.kc-back-link {
  position: absolute;
  top: 32px;
  left: 0;
  color: #f0b429;
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-weight: 900;
  font-size: 0.78rem;
}
.kc-back-link:hover,
.kc-back-link:focus {
  color: #fff2bd;
}
.kc-hero-copy {
  max-width: 790px;
  padding-top: 52px;
}
.kc-kicker,
.kc-section-heading span,
.kc-panel-label,
.kc-track-heading span,
.kc-callout-copy span,
.kc-badge-tracker > span,
.kc-mission-type {
  display: inline-flex;
  color: #f0b429;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 0.72rem;
  font-weight: 950;
}
.kc-hero h1 {
  margin: 18px 0 0;
  font-size: clamp(4rem, 12vw, 9rem);
  line-height: 0.82;
  letter-spacing: -0.045em;
  text-transform: uppercase;
  text-shadow: 0 0 34px rgba(34, 211, 238, 0.2);
}
.kc-hero-copy p {
  max-width: 720px;
  margin: 28px 0 0;
  color: #dbeafe;
  font-size: clamp(1.15rem, 2vw, 1.65rem);
  line-height: 1.55;
  font-weight: 720;
}
.kc-hero-actions,
.kc-spotlight-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 34px;
}
.kc-primary-action,
.kc-secondary-action {
  min-height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  padding: 0 22px;
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.13em;
  font-size: 0.78rem;
  font-weight: 950;
  transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
}
.kc-primary-action {
  background: #f0b429;
  color: #061121;
  box-shadow: 0 16px 34px rgba(240,180,41,0.24);
}
.kc-secondary-action {
  color: white;
  border: 1px solid rgba(255,255,255,0.22);
  background: rgba(255,255,255,0.08);
}
.kc-primary-action:hover,
.kc-secondary-action:hover,
.kc-primary-action:focus,
.kc-secondary-action:focus {
  transform: translateY(-2px);
}
.kc-secondary-action:hover,
.kc-secondary-action:focus {
  border-color: rgba(240,180,41,0.68);
  background: rgba(240,180,41,0.14);
}
.kc-hero-console {
  border: 1px solid rgba(255,255,255,0.16);
  border-radius: 28px;
  padding: 22px;
  background:
    linear-gradient(145deg, rgba(7,20,40,0.94), rgba(4,13,26,0.82)),
    radial-gradient(circle at top right, rgba(34,211,238,0.18), transparent 14rem);
  box-shadow: 0 24px 70px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.08);
  backdrop-filter: blur(16px);
}
.kc-console-top {
  display: flex;
  gap: 16px;
  align-items: center;
}
.kc-console-top img {
  filter: drop-shadow(0 0 18px rgba(34,211,238,0.55));
}
.kc-console-top span,
.kc-console-callout span {
  display: block;
  color: #7dd3fc;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.68rem;
  font-weight: 950;
}
.kc-console-top strong,
.kc-console-callout strong {
  display: block;
  margin-top: 5px;
  color: white;
  font-size: 1.08rem;
}
.kc-console-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 24px;
}
.kc-console-stats div {
  min-height: 92px;
  border-radius: 18px;
  padding: 14px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.09);
}
.kc-console-stats strong {
  display: block;
  color: #f0b429;
  font-size: 2rem;
  line-height: 1;
}
.kc-console-stats span {
  display: block;
  margin-top: 8px;
  color: #cbd5e1;
  font-size: 0.74rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.kc-console-callout {
  margin-top: 14px;
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(240,180,41,0.16), rgba(34,211,238,0.1));
  border: 1px solid rgba(240,180,41,0.24);
}
.kc-spotlight-section,
.kc-browse-section,
.kc-lower-section,
.kc-parent-section {
  position: relative;
  padding: 72px 0;
}
.kc-section-heading {
  max-width: 760px;
}
.kc-section-heading h2,
.kc-track-heading h2,
.kc-callout-copy h2,
.kc-badge-tracker h2,
.kc-parent-grid h2 {
  margin: 12px 0 0;
  color: #061121;
  font-size: clamp(2rem, 4vw, 4.3rem);
  line-height: 0.95;
  letter-spacing: -0.04em;
  font-weight: 950;
}
.kc-section-heading p,
.kc-track-heading p,
.kc-callout-copy p,
.kc-badge-tracker p,
.kc-parent-notes p {
  margin: 16px 0 0;
  color: #334155;
  font-size: 1.04rem;
  line-height: 1.7;
  font-weight: 650;
}
.kc-spotlight {
  margin-top: 32px;
  display: grid;
  grid-template-columns: 0.82fr 1.18fr;
  gap: 0;
  overflow: hidden;
  border-radius: 34px;
  border: 1px solid rgba(6,17,33,0.12);
  background: white;
  box-shadow: 0 24px 70px rgba(15,23,42,0.16);
}
.kc-spotlight-art {
  position: relative;
  min-height: 520px;
  background:
    radial-gradient(circle at 40% 28%, rgba(34,211,238,0.2), transparent 14rem),
    #061121;
}
.kc-spotlight-img {
  object-fit: contain;
  padding: 42px;
  filter: drop-shadow(0 22px 32px rgba(0,0,0,0.16));
}
.kc-art-badge {
  position: absolute;
  left: 24px;
  bottom: 24px;
  border-radius: 999px;
  padding: 12px 16px;
  background: #f0b429;
  color: #061121;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.72rem;
  font-weight: 950;
}
.kc-spotlight-copy {
  padding: clamp(28px, 5vw, 58px);
}
.kc-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.kc-card-meta span,
.kc-age-chip,
.kc-tag-row span {
  border-radius: 999px;
  padding: 8px 12px;
  background: #eef6fb;
  border: 1px solid rgba(6,17,33,0.12);
  color: #061121;
  font-size: 0.72rem;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 950;
}
.kc-spotlight h3 {
  margin: 24px 0 0;
  color: #061121;
  font-size: clamp(2.2rem, 5vw, 5rem);
  line-height: 0.9;
  letter-spacing: -0.05em;
  font-weight: 950;
}
.kc-spotlight-copy > p,
.kc-mission-card .kc-card-body > p {
  margin: 18px 0 0;
  color: #334155;
  font-size: 1.08rem;
  line-height: 1.65;
  font-weight: 680;
}
.kc-learn-panel,
.kc-learn-card,
.kc-note {
  margin-top: 22px;
  border-radius: 20px;
  padding: 18px;
  background: linear-gradient(135deg, rgba(34,211,238,0.12), rgba(240,180,41,0.1));
  border: 1px solid rgba(27,88,201,0.16);
}
.kc-learn-panel span,
.kc-learn-card span,
.kc-note strong,
.kc-supplies > span,
.kc-steps > span,
.kc-info-tile span,
.kc-filter-summary {
  display: block;
  color: #1b58c9;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.68rem;
  font-weight: 950;
}
.kc-learn-panel strong,
.kc-learn-card strong,
.kc-note span {
  display: block;
  margin-top: 8px;
  color: #061121;
  font-size: 1rem;
  line-height: 1.55;
}
.kc-mini-grid,
.kc-detail-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}
.kc-info-tile {
  border-radius: 18px;
  padding: 16px;
  background: #f8fbff;
  border: 1px solid rgba(6,17,33,0.1);
}
.kc-info-tile strong {
  display: block;
  margin-top: 7px;
  color: #061121;
  font-size: 0.96rem;
}
.kc-supply-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
.kc-supply-row span,
.kc-supplies em {
  display: inline-flex;
  border-radius: 999px;
  padding: 8px 11px;
  background: #061121;
  color: white;
  font-size: 0.78rem;
  font-style: normal;
  font-weight: 850;
}
.kc-filter-panel {
  display: grid;
  grid-template-columns: 0.72fr 1.28fr;
  gap: 20px;
  align-items: start;
  padding: 22px;
  border-radius: 28px;
  background:
    linear-gradient(135deg, rgba(255,255,255,0.92), rgba(255,255,255,0.76)),
    radial-gradient(circle at top left, rgba(34,211,238,0.2), transparent 18rem);
  border: 1px solid rgba(6,17,33,0.1);
  box-shadow: 0 18px 50px rgba(15,23,42,0.1);
}
.kc-filter-row,
.kc-theme-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.kc-filter-row button,
.kc-theme-row button {
  min-height: 42px;
  border: 1px solid rgba(6,17,33,0.13);
  border-radius: 999px;
  background: white;
  color: #061121;
  padding: 0 14px;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 900;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease, transform 160ms ease;
}
.kc-filter-row button.is-active,
.kc-theme-row button.is-active {
  background: #061121;
  color: #f0b429;
  border-color: #061121;
}
.kc-filter-row button:hover,
.kc-theme-row button:hover,
.kc-filter-row button:focus,
.kc-theme-row button:focus {
  transform: translateY(-1px);
}
.kc-filter-summary {
  margin-top: 18px;
  color: #64748b;
}
.kc-filter-summary strong {
  color: #061121;
}
.kc-age-track {
  margin-top: 56px;
}
.kc-track-heading {
  max-width: 720px;
}
.kc-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
  margin-top: 26px;
}
.kc-mission-card {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  overflow: hidden;
  border-radius: 28px;
  background: white;
  border: 1px solid rgba(6,17,33,0.1);
  box-shadow: 0 20px 52px rgba(15,23,42,0.12);
}
.kc-mission-card header {
  display: grid;
  grid-template-columns: 62px 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 22px;
  border-top: 7px solid var(--accent);
  background:
    radial-gradient(circle at 12% 0%, color-mix(in srgb, var(--accent) 20%, transparent), transparent 18rem),
    #fff;
}
.kc-mission-card[data-accent="cyan"] { --accent: #22d3ee; }
.kc-mission-card[data-accent="gold"] { --accent: #f0b429; }
.kc-mission-card[data-accent="red"] { --accent: #ef4444; }
.kc-mission-card[data-accent="green"] { --accent: #22c55e; }
.kc-mission-card[data-accent="blue"] { --accent: #1b58c9; }
.kc-number-badge {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  background: var(--accent);
  color: #061121;
  font-size: 1.5rem;
  font-weight: 950;
  box-shadow: 0 12px 26px color-mix(in srgb, var(--accent) 28%, transparent);
}
.kc-mission-card h3 {
  margin: 6px 0 0;
  color: #061121;
  font-size: clamp(1.55rem, 3vw, 2.25rem);
  line-height: 1;
  letter-spacing: -0.035em;
  font-weight: 950;
}
.kc-card-body {
  padding: 0 22px 22px;
}
.kc-supplies,
.kc-steps {
  margin-top: 22px;
}
.kc-supplies div {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.kc-steps ol {
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
  counter-reset: step;
}
.kc-steps li {
  position: relative;
  min-height: 44px;
  padding: 10px 12px 10px 54px;
  border-radius: 16px;
  background: #f5f9fd;
  color: #1e293b;
  font-weight: 650;
  line-height: 1.5;
  counter-increment: step;
}
.kc-steps li::before {
  content: counter(step);
  position: absolute;
  left: 10px;
  top: 10px;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background: #061121;
  color: #f0b429;
  font-weight: 950;
}
.kc-mission-card footer {
  margin-top: auto;
  padding: 18px 22px 22px;
  border-top: 1px solid rgba(6,17,33,0.08);
}
.kc-tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.kc-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
}
.kc-complete-badge,
.kc-card-actions a {
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0 13px;
  text-decoration: none;
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 950;
}
.kc-complete-badge {
  background: rgba(240,180,41,0.18);
  color: #875700;
  border: 1px solid rgba(240,180,41,0.34);
}
.kc-card-actions a {
  background: #061121;
  color: white;
}
.kc-lower-section {
  background: linear-gradient(180deg, transparent, rgba(4,13,26,0.05));
}
.kc-lower-grid {
  display: grid;
  grid-template-columns: 1.35fr 0.65fr;
  gap: 22px;
}
.kc-printable-callout,
.kc-badge-tracker,
.kc-parent-grid {
  border-radius: 32px;
  border: 1px solid rgba(255,255,255,0.12);
  background: #061121;
  color: white;
  box-shadow: 0 22px 70px rgba(15,23,42,0.18);
}
.kc-printable-callout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 28px;
  overflow: hidden;
  padding: 34px;
}
.kc-callout-copy h2,
.kc-badge-tracker h2,
.kc-parent-grid h2 {
  color: white;
}
.kc-callout-copy p,
.kc-badge-tracker p {
  color: #cbd5e1;
}
.kc-print-stack {
  position: relative;
  min-height: 310px;
}
.kc-print-stack img {
  position: absolute;
  width: min(88%, 340px);
  height: auto;
  border-radius: 18px;
  background: white;
  padding: 10px;
  box-shadow: 0 24px 52px rgba(0,0,0,0.32);
}
.kc-print-stack img:first-child {
  top: 0;
  right: 0;
  transform: rotate(5deg);
}
.kc-print-stack img:last-child {
  left: 0;
  bottom: 0;
  transform: rotate(-6deg);
}
.kc-badge-tracker {
  padding: 28px;
}
.kc-badge-grid {
  display: grid;
  gap: 10px;
  margin-top: 20px;
}
.kc-badge-grid div {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 18px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
}
.kc-badge-grid svg {
  width: 26px;
  height: 26px;
  fill: #f0b429;
  flex: 0 0 auto;
}
.kc-badge-grid strong {
  color: white;
  font-size: 0.92rem;
}
.kc-parent-section {
  padding-top: 34px;
}
.kc-parent-grid {
  display: grid;
  grid-template-columns: 0.7fr 1.3fr;
  gap: 28px;
  padding: 34px;
  background:
    radial-gradient(circle at 10% 10%, rgba(34,211,238,0.16), transparent 22rem),
    #071428;
}
.kc-parent-notes {
  display: grid;
  gap: 12px;
}
.kc-parent-notes p {
  margin: 0;
  padding: 16px;
  border-radius: 18px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  color: #dbeafe;
}
@media (max-width: 980px) {
  .kc-hero-inner,
  .kc-spotlight,
  .kc-filter-panel,
  .kc-lower-grid,
  .kc-printable-callout,
  .kc-parent-grid {
    grid-template-columns: 1fr;
  }
  .kc-hero-console {
    max-width: 520px;
  }
  .kc-card-grid {
    grid-template-columns: 1fr;
  }
  .kc-spotlight-art {
    min-height: 390px;
  }
}
@media (max-width: 680px) {
  .kc-wrap {
    width: min(100% - 24px, 1240px);
  }
  .kc-hero {
    min-height: 0;
  }
  .kc-hero-inner {
    min-height: 0;
    padding: 72px 0 44px;
    gap: 30px;
  }
  .kc-hero h1 {
    font-size: clamp(3.5rem, 17vw, 5.2rem);
  }
  .kc-console-stats,
  .kc-mini-grid,
  .kc-detail-row {
    grid-template-columns: 1fr;
  }
  .kc-spotlight-section,
  .kc-browse-section,
  .kc-lower-section,
  .kc-parent-section {
    padding: 48px 0;
  }
  .kc-spotlight-copy,
  .kc-printable-callout,
  .kc-badge-tracker,
  .kc-parent-grid {
    padding: 22px;
  }
  .kc-mission-card header {
    grid-template-columns: 54px 1fr;
  }
  .kc-age-chip {
    grid-column: 1 / -1;
    width: fit-content;
  }
  .kc-number-badge {
    width: 52px;
    height: 52px;
  }
  .kc-print-stack {
    min-height: 250px;
  }
}
`;
