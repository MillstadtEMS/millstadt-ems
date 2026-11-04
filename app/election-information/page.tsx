import type { Metadata } from "next";
import ElectionNightIllustration from "./ElectionNightIllustration";
import { connection } from "next/server";
import { ArrowUpRight, CheckCheck, ChevronDown } from "lucide-react";
import { getElectionReport } from "@/lib/election-results/report";
import { sources, type VoteRow } from "@/lib/election-results/county";
import { canvassIndex } from "@/lib/election-results/canvass";
import RefreshResults from "./RefreshResults";
import styles from "./Results.module.css";

export const metadata: Metadata = {
  title: "Election Results",
  description: "Follow St. Clair County’s returns for the November 3, 2026 Millstadt EMS ESD referendum. Explore results by precinct, township, and voting type.",
};
const numbers = new Intl.NumberFormat("en-US");
const format = (n: number) => numbers.format(n);
const checkedTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago", month: "short", day: "numeric", year: "numeric",
  hour: "numeric", minute: "2-digit", timeZoneName: "short",
});
const countySummary = sources.summary + "#:~:text=organized%20as%20Millstadt%20EMS%20ESD";

function CountyLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a className={styles.link} href={href} target="_blank" rel="noopener noreferrer">
    {children} <ArrowUpRight size={15} aria-hidden="true" />
  </a>;
}

function Breakdown({ title, column, rows, source, open = false }: {
  title: string; column: string; rows: VoteRow[]; source: string; open?: boolean;
}) {
  const yes = rows.reduce((sum, row) => sum + row.yes, 0);
  const no = rows.reduce((sum, row) => sum + row.no, 0);
  return <details className={styles.details} open={open}>
    <summary>
      <span>{title}</span>
      <small>{rows.length} {column === "Voting type" ? "types" : column.toLowerCase() + "s"}</small>
      <ChevronDown size={19} aria-hidden="true" />
    </summary>
    <div className={styles.detailBody}>
      <table>
        <caption className="sr-only">{title} for the Millstadt EMS ESD referendum</caption>
        <thead><tr><th scope="col">{column}</th><th scope="col">Yes</th><th scope="col">No</th><th scope="col">Total</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.label}>
          <th scope="row">{row.label}</th><td>{format(row.yes)}</td><td>{format(row.no)}</td><td>{format(row.yes + row.no)}</td>
        </tr>)}</tbody>
        <tfoot><tr><th scope="row">Total</th><td>{format(yes)}</td><td>{format(no)}</td><td>{format(yes + no)}</td></tr></tfoot>
      </table>
      <CountyLink href={source}>View county report</CountyLink>
    </div>
  </details>;
}

export default async function ElectionResultsPage() {
  await connection();
  const report = await getElectionReport();
  const total = report.yes + report.no;
  const percent = (votes: number) => total ? (100 * votes / total).toFixed(2) + "%" : "—";
  const margin = report.yes - report.no;
  const gap = Math.abs(margin);
  const lead = margin === 0 ? "tie" : margin > 0 ? "yes" : "no";
  const outcome = report.official ? lead : "pending";
  const votes = (n: number) => n === 1 ? "1 vote" : format(n) + " votes";
  const certification = {
    pending: "These totals may change. Official results will be posted here after St. Clair County certifies the election.",
    yes: "The referendum passed by " + votes(gap) + ".",
    no: "The referendum did not pass. No received " + votes(report.no) + " and Yes received " + votes(report.yes) + ".",
    tie: "The certified count is tied, with " + votes(report.yes) + " on each side.",
  };
  const canvassHref = report.certifiedPage ? report.canvassUrl + "#page=" + report.certifiedPage : report.canvassUrl;
  return <article className={styles.page} data-lead={lead}>
    <RefreshResults />
    <div className={styles.wrap}>
      <header className={styles.mast}>
        <span>Millstadt EMS <b>/</b> Election desk</span>
        <span>St. Clair County, Illinois</span>
      </header>
      <section className={styles.hero} aria-labelledby="election-heading">
        <div className={styles.lead}>
          <p className={styles.kicker}><span className={styles.dash} /> November 3, 2026 <b>·</b> General election</p>
          <h1 id="election-heading">Election results</h1>
          <h2>Millstadt EMS ESD referendum</h2>
          <p className={styles.description}>Voters weighed whether to form an emergency services district and authorize a property tax levy of up to 0.40%.</p>
        </div>
        <div className={styles.score}>
          <div className={styles.scoreHead}>
            <span className={styles.status}>{report.official ? "Certified results" : "Unofficial results"}</span>
            <span>{format(total)} votes</span>
          </div>
          <div className={styles.numbers}>
            <div><span><i />Yes</span><strong>{format(report.yes)}</strong><small>{percent(report.yes)}</small></div>
            <div><span><i />No</span><strong>{format(report.no)}</strong><small>{percent(report.no)}</small></div>
          </div>
          <div className={styles.bar} aria-hidden="true"><span style={{ width: total ? percent(report.yes) : "0%" }} /></div>
          <p className={styles.gap}>{gap ? <><strong>{format(gap)}-vote difference</strong> <span>· {lead === "yes" ? "Yes" : "No"} {report.official ? "majority" : "ahead"}</span></> : <strong>{total ? "Tied vote" : report.official ? "No votes recorded" : "Awaiting votes"}</strong>}</p>
          <p className={styles.reporting}>{report.certifiedPage ? "Source: St. Clair County Clerk’s official canvass" : report.reporting}</p>
        </div>
        <ElectionNightIllustration outcome={outcome} />
      </section>
      <aside className={styles.cert}>
        <CheckCheck size={24} aria-hidden="true" />
        <div><h2>{report.official ? "Results certified by St. Clair County" : report.canvassUrl ? "County canvass available" : "Awaiting certification"}</h2>
          <p>{outcome === "pending" && report.canvassUrl
            ? "The clerk has posted a canvass. Refer to the county document while this referendum’s certified count is being verified."
            : certification[outcome]}</p>
        </div>
        <CountyLink href={canvassHref ?? canvassIndex}>{canvassHref ? "View county canvass" : "County canvass records"}</CountyLink>
      </aside>
      <section className={styles.breakdowns} aria-labelledby="details-heading">
        <div className={styles.sectionIntro}>
          <p className={styles.kicker}><span className={styles.dash} /> County returns</p>
          <h2 id="details-heading">Inside the count</h2>
          <p>{report.detailNote
            ? report.detailNote + " They cover " + votes(report.detailTotal) + ". The certified count above comes from the clerk’s canvass."
            : "Explore the votes by precinct, township, or voting type. Each view breaks down the same " + votes(report.detailTotal) + "."}</p>
          <div className={styles.sourceBlock}>
            <p><strong>{report.saved ? "Last verified county figures" : "As of"}</strong><br />
              <time dateTime={report.checkedAt}>{checkedTime.format(new Date(report.checkedAt))}</time></p>
            <CountyLink href={countySummary}>St. Clair County results</CountyLink>
          </div>
        </div>
        <div className={styles.tables}>
          <Breakdown title="Precinct results" column="Precinct" rows={report.precincts} source={sources.precincts} open />
          <Breakdown title="Township results" column="Township" rows={report.townships} source={sources.townships} />
          <Breakdown title="Voting type results" column="Voting type" rows={report.votingTypes} source={countySummary} />
        </div>
      </section>
    </div>
  </article>;
}
