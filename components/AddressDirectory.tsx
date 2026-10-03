"use client";
import { useEffect, useMemo, useState } from "react";
import type { DirectoryAddress, DirectoryGroup, ElectionDirectory } from "@/lib/election-directory-types";
import styles from "./AddressDirectory.module.css";
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function AddressDirectory({ directory, initialPin }: { directory: ElectionDirectory; initialPin?: string }) {
  const initial = directory.addresses.find(a => a.parcels.some(p => p.pin === initialPin));
  const [query, setQuery] = useState("");
  const [street, setStreet] = useState<string | null>(initial?.street ?? null);
  const [subdivision, setSubdivision] = useState<string | null>(null);
  // One shared selection across street and subdivision views.
  const [openAddress, setOpenAddress] = useState<string | null>(initial ? `street:${initial.id}` : null);
  const addressMap = useMemo(() => new Map(directory.addresses.map(a => [a.id, a])), [directory]);
  const normalize = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const search = normalize(query);
  const matches = (a: DirectoryAddress) => !search || normalize(`${a.address} ${a.city}`).includes(search) || a.parcels.some(p => p.pin.includes(search));
  const matchingStreets = directory.streets.filter(s => normalize(s.name).includes(search) || s.addressIds.some(id => matches(addressMap.get(id)!)));
  useEffect(() => {
    const restore = () => {
      const pin = new URLSearchParams(window.location.search).get("address");
      const a = directory.addresses.find(a => a.parcels.some(p => p.pin === pin));
      setQuery(""); setSubdivision(null); setStreet(a?.street ?? null); setOpenAddress(a ? `street:${a.id}` : null);
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [directory]);
  function toggleAddress(a: DirectoryAddress, context: string) {
    const key = `${context}:${a.id}`;
    const next = openAddress === key ? null : key;
    setOpenAddress(next);
    window.history.pushState(null, "", `/election-information/address-directory${next ? `?address=${a.id}` : ""}`);
  }
  function addressRows(ids: string[], context: string, filter = true) {
    return ids.map(id => addressMap.get(id)!).filter(a => !filter || matches(a)).map(a => {
      const key = `${context}:${a.id}`;
      const open = openAddress === key;
      const panel = `address-${context}-${a.id}`;
      return <div key={key} className={styles.address}>
        <a href={`?address=${a.id}`} aria-expanded={open} aria-controls={panel} className={styles.addressLink} onClick={event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); toggleAddress(a, context); }}>
          <span><strong>{a.address}</strong><small>{a.city}</small></span><span aria-hidden="true">{open ? "−" : "+"}</span>
        </a>
        {open && <div id={panel} className={styles.addressContent}>
          {a.parcels.length > 1 && <p className={styles.shared}>This address has more than one county parcel. Match the parcel number on your tax bill.</p>}
          {a.parcels.map(p => <div key={p.pin} className={styles.parcel}>
            {a.parcels.length > 1 && <p className={styles.parcelNumber}>Parcel {p.parcel}</p>}
            <dl className={styles.amounts}>
              <div><dt>Baseline EMS tax</dt><dd>{money.format(p.before)}</dd></div>
              <div><dt>EMS tax at 0.30%</dt><dd>{money.format(p.after)}</dd></div>
              <div className={styles.increase}><dt>Annual increase</dt><dd>{money.format(p.increase)}</dd></div>
            </dl>
            {p.area !== "millstadt" && <p className={styles.note}>No separate ambulance levy offset is identified for this fire tax district in the county’s 2025 report.</p>}
          </div>)}
        </div>}
      </div>;
    });
  }
  function groupRows(groups: DirectoryGroup[]) {
    return groups.map(g => <div key={g.id} className={styles.group}>
      <button className={styles.groupButton} aria-expanded={subdivision === g.id} aria-controls={`group-${g.id}`} onClick={() => { setSubdivision(subdivision === g.id ? null : g.id); setStreet(null); setOpenAddress(null); }}><span>{g.name}</span><span aria-hidden="true">{subdivision === g.id ? "−" : "+"}</span></button>
      {subdivision === g.id && <div id={`group-${g.id}`} className={styles.groupContent}>
        <a className={styles.download} href={`/api/election-directory/download/${g.id}`}>Download Excel sheet</a>
        {addressRows(g.addressIds, g.id, false)}
      </div>}
    </div>);
  }
  return <div className={`${styles.directory} wrap`}>
    <nav className={styles.jumpLinks} aria-label="Address browsing"><a href="#street-heading">By street</a><a href="#subdivision-heading">By subdivision</a></nav>
    <p className={styles.intro}>Annual EMS estimates use the county’s 2025 taxable values and the planned 0.30% rate. The baseline uses the existing 0.09% ambulance levy in the Millstadt Fire Protection District and no separate ambulance levy offset in the other two areas. The comparison assumes the existing ambulance levy ends when the ESD levy begins.</p>
    <section aria-labelledby="street-heading">
      <h2 id="street-heading">By street</h2>
      <label className={styles.searchLabel} htmlFor="address-search">Find a street or address</label>
      <input className={styles.search} id="address-search" type="search" value={query} onChange={e => { setQuery(e.target.value); setStreet(null); setOpenAddress(null); }} placeholder="Street name or house number" autoComplete="off" />
      <div className={styles.streetList}>
        {matchingStreets.map((s, i) => <div key={s.name} className={`${styles.group} ${street === s.name ? styles.expanded : ""}`}>
          <button className={styles.groupButton} aria-expanded={street === s.name} aria-controls={`street-${i}`} onClick={() => { setStreet(street === s.name ? null : s.name); setSubdivision(null); setOpenAddress(null); }}><span>{s.name}</span><span aria-hidden="true">{street === s.name ? "−" : "+"}</span></button>
          {street === s.name && <div id={`street-${i}`} className={styles.groupContent}>{addressRows(s.addressIds, "street")}</div>}
        </div>)}
      </div>
      {!matchingStreets.length && <p>No matching address. Try just the street name.</p>}
      <p className={styles.note}>Address not listed? <a href="/election-information#ems-tax-calculator">Use the EMS tax calculator.</a> Street names follow county records. Estimates may change with future assessments, exemptions or levies.</p>
    </section>
    <section aria-labelledby="subdivision-heading" className={styles.subdivisions}>
      <h2 id="subdivision-heading">By subdivision</h2>
      <p className={styles.intro}>Open a subdivision to see its addresses or download its Excel sheet.</p>
      <div className={styles.subdivisionList}>{groupRows(directory.groups.filter(g => g.kind === "subdivision"))}</div>
      <details className={styles.otherAreas}><summary>Other county areas</summary><div className={styles.subdivisionList}>{groupRows(directory.groups.filter(g => g.kind === "area"))}</div></details>
    </section>
  </div>;
}
