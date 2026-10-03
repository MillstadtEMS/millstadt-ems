import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { calculateEmsTax, type TaxArea } from "../lib/esd-tax";
import type { ElectionDirectory, DirectoryAddress, DirectoryGroup } from "../lib/election-directory-types";

// Inputs are the read-only extraction from the audited workbook. No saved
// scenario tax amounts are reused: every amount goes through the site engine.
const audit = process.argv[2];
if (!audit) throw new Error("Pass the workbook-audit extraction directory.");
const cells = JSON.parse(readFileSync(`${audit}/expanded-cells.json`, "utf8"))["County records"];
const parcels = JSON.parse(readFileSync(`${audit}/parcels.json`, "utf8"));
const value = (row: number, col: string): string => String(cells[`${col}${row}`]?.v ?? "").trim();
const areaMap: Record<string, TaxArea> = { FDMI: "millstadt", FDHE: "hecker", FDWA: "waterloo" };
const collator = new Intl.Collator("en-US", { numeric: true, sensitivity: "base" });
const byAddress = new Map<string, DirectoryAddress>();
const groups = new Map<string, DirectoryGroup>();
const excluded: { pin: string; reason: string; address: string }[] = [];
const seenPins = new Set<string>();
for (const p of parcels) {
  if (seenPins.has(p.pin)) throw new Error(`Duplicate PIN ${p.pin}`);
  seenPins.add(p.pin);
  const raw = value(p.row, "E");
  let reason = p.retired === "R" ? "Retired parcel" : !p.valid ? "No verified 2025 assessment" : "";
  const match = raw.match(/^(\d+(?:(?:[-/]| & )\d+)?)\s+(.+?)\s+(MILLSTADT|BELLEVILLE|WATERLOO|COLUMBIA|SMITHTON|DUPO)\s*, IL (\d{5})(?:\s+(.*))?$/);
  if (!reason && !match) reason = "No usable numbered site address";
  if (reason || !match) { excluded.push({ pin: p.pin, reason, address: raw }); continue; }
  const [, number, street, city, zip, suffix] = match;
  const address = `${number} ${street}`;
  const key = `${address} ${city} ${zip}${suffix ? ` ${suffix}` : ""}`;
  let a = byAddress.get(key);
  if (!a) { a = { id: p.pin, address, number, street, city: `${city}, IL ${zip}${suffix ? ` (${suffix})` : ""}`, parcels: [] }; byAddress.set(key, a); }
  const label = String(p.group).replace(/\*+$/, "").trim();
  const groupId = createHash("sha256").update(String(p.group)).digest("hex").slice(0, 16);
  const area = areaMap[p.area];
  if (!area || value(p.row, "H") !== "2025") throw new Error(`Invalid area or year ${p.pin}`);
  const taxable = value(p.row, "M");
  if (!/^\d+(?:\.\d{1,2})?$/.test(taxable)) throw new Error(`Invalid taxable value ${p.pin}: ${taxable}`);
  const result = calculateEmsTax({ area, mode: "bill", taxableValue: taxable });
  a.parcels.push({ pin: p.pin, parcel: p.parcel, group: groupId, area, taxable, before: result.before, after: result.after, increase: result.increase });
  if (!groups.has(groupId)) groups.set(groupId, { id: groupId, name: label, kind: value(p.row, "AH") === "Subdivision / plat name" ? "subdivision" : "area", addressIds: [] });
  const group = groups.get(groupId)!;
  if (!group.addressIds.includes(a.id)) group.addressIds.push(a.id);
}
const compare = (a: DirectoryAddress, b: DirectoryAddress) => collator.compare(a.street, b.street) || collator.compare(a.number, b.number) || collator.compare(a.city, b.city) || a.id.localeCompare(b.id);
const addresses = [...byAddress.values()].sort(compare);
const order = new Map(addresses.map((a, i) => [a.id, i]));
for (const a of addresses) a.parcels.sort((a, b) => a.pin.localeCompare(b.pin));
const streetMap = new Map<string, string[]>();
for (const a of addresses) { if (!streetMap.has(a.street)) streetMap.set(a.street, []); streetMap.get(a.street)!.push(a.id); }
const directory: ElectionDirectory = { year: 2025, addresses, streets: [...streetMap].map(([name, addressIds]) => ({ name, addressIds })), groups: [...groups.values()].sort((a,b) => collator.compare(a.name,b.name)) };
for (const g of directory.groups) g.addressIds.sort((a,b) => order.get(a)! - order.get(b)!);
mkdirSync("data/election-directory", { recursive: true });
writeFileSync("data/election-directory/directory.json", JSON.stringify(directory));
writeFileSync(`${audit}/directory-exclusions.json`, JSON.stringify(excluded, null, 2));
const summary = { sourceParcels: parcels.length, includedParcels: addresses.reduce((n,a)=>n+a.parcels.length,0), addresses: addresses.length, streets: directory.streets.length, subdivisions: directory.groups.filter(g=>g.kind==="subdivision").length, otherAreas: directory.groups.filter(g=>g.kind==="area").length, sharedAddresses: addresses.filter(a=>a.parcels.length>1).length, excluded: excluded.reduce<Record<string,number>>((m,p)=>{m[p.reason]=(m[p.reason]||0)+1;return m;},{}) };
writeFileSync(`${audit}/directory-summary.json`, JSON.stringify(summary, null, 2));
console.log(summary);
