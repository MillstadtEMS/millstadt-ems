import { parse, type HTMLElement } from "next/dist/compiled/node-html-parser";

const county = "https://stclair.platinumelectionresults.com";
export const sources = {
  summary: county + "/races/6/25",
  precincts: county + "/raceprecincts/6/350",
  townships: county + "/racetownships/6/350",
};

export type VoteRow = { label: string; yes: number; no: number };

function required<T>(value: T | null | undefined, message: string): T {
  if (value == null) throw new Error(message);
  return value;
}

function count(value: string) {
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(value)) throw new Error("Invalid county vote count");
  const n = Number(value.replaceAll(",", ""));
  if (!Number.isSafeInteger(n)) throw new Error("Invalid county vote count");
  return n;
}

function cells(row: HTMLElement, selector: string) {
  return row.querySelectorAll(selector).map(cell => cell.text.trim());
}

function electionStatus(title: string) {
  const match = /^GENERAL ELECTION \(11\/03\/2026\) (Unofficial|Official|Certified) Results$/i.exec(title.trim());
  if (!match) throw new Error("Election date or status changed");
  return match[1].toLowerCase() !== "unofficial";
}

function geography(html: string, group: string, official: boolean, yes: number, no: number) {
  const page = parse(html);
  const title = page.querySelector("#electionTitle")?.text ?? "";
  if (!page.querySelector("main h1")?.text.includes("PROPOSED MILLSTADT FIRE") || electionStatus(title) !== official) {
    throw new Error("County detail report does not match the contest");
  }
  const table = required(page.querySelector("main table"), "Missing county detail report");
  const headers = cells(table, "th");
  const column = (name: string) => headers.findIndex(h => h.split(" (")[0] === name);
  const rows = table.querySelectorAll("tr").filter(row => row.querySelector("td")).map(row => {
    const values = cells(row, "td");
    const label = required(values[column(group)], "Missing county geography");
    const yes = count(values[column("YES")]);
    const no = count(values[column("NO")]);
    if (yes + no !== count(values[column("Total")])) throw new Error("Inconsistent county row");
    return { label, yes, no };
  });
  const totals = rows.find(row => row.label === "Totals");
  const detail = rows.filter(row => row.label !== "Totals");
  if (!totals || totals.yes !== yes || totals.no !== no ||
      detail.reduce((sum, row) => sum + row.yes, 0) !== yes ||
      detail.reduce((sum, row) => sum + row.no, 0) !== no || !detail.length) {
    throw new Error("County detail and summary totals differ");
  }
  return detail;
}

export function parseResults(summary: string, precincts: string, townships: string) {
  const page = parse(summary);
  const card = required(page.querySelector('a[href="/raceprecincts/6/350"]')?.closest(".card"), "Missing EMS contest");
  if (!card.querySelector("h3")?.text.includes("organized as Millstadt EMS ESD")) throw new Error("Wrong ballot question");
  const title = card.closest(".row-cols-1")?.previousElementSibling?.querySelector("h2");
  const official = electionStatus(required(title, "Missing election heading").text);
  const reporting = required(card.querySelector(".card-header .col-12"), "Missing reporting status").text.trim();
  const options = card.querySelectorAll(".race-voting-type-350").map(section => {
    const heading = required(section.previousElementSibling, "Missing option");
    const label = heading.querySelector(".flex-grow-1")?.text.trim();
    const headers = cells(section, "th");
    const votes = cells(section, "td").map(count);
    if (votes.length !== headers.length) throw new Error("Incomplete voting type report");
    const total = votes[headers.indexOf("Total")];
    const optionVotes = heading.querySelectorAll(".can-line")[2]?.text.trim() ?? "";
    if (count(optionVotes) !== total) throw new Error("Voting type and option totals differ");
    const types = headers.flatMap((label, i) => label === "Total" ? [] : [{ label, votes: votes[i] }]);
    if (types.reduce((sum, type) => sum + type.votes, 0) !== total) throw new Error("Inconsistent voting types");
    return { label, total, types };
  });
  const yes = required(options.find(option => option.label === "YES"), "Missing Yes");
  const no = required(options.find(option => option.label === "NO"), "Missing No");
  if (options.length !== 2 || yes.types.length !== no.types.length) throw new Error("Unexpected ballot options");
  const votingTypes = yes.types.map(type => ({
    label: type.label,
    yes: type.votes,
    no: required(no.types.find(other => other.label === type.label), "Voting type mismatch").votes,
  }));
  return {
    official, reporting, yes: yes.total, no: no.total, votingTypes,
    precincts: geography(precincts, "Precinct", official, yes.total, no.total),
    townships: geography(townships, "Township", official, yes.total, no.total),
  };
}

export async function readCountyResults() {
  async function read(url: string) {
    const response = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(7000) });
    if (!response.ok) throw new Error("County report unavailable");
    return response.text();
  }
  const [summary, precincts, townships] = await Promise.all([read(sources.summary), read(sources.precincts), read(sources.townships)]);
  return { ...parseResults(summary, precincts, townships), checkedAt: new Date().toISOString() };
}
