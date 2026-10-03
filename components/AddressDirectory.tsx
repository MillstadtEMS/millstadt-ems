"use client";
import { useEffect, useMemo, useState } from "react";
import type { DirectoryAddress, DirectoryParcel, ElectionDirectory } from "@/lib/election-directory-types";
import styles from "./AddressDirectory.module.css";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");

function ParcelAmounts({ parcel }: { parcel: DirectoryParcel }) {
  return <div className={styles.parcelAmounts}>
    <p className={styles.yearly}>Estimated yearly amounts</p>
    <dl className={styles.amounts}>
      <div><dt>EMS tax now</dt><dd>{money.format(parcel.before)}</dd></div>
      <div><dt>With the ESD (0.30%)</dt><dd>{money.format(parcel.after)}</dd></div>
      <div className={styles.increase}><dt>Yearly increase</dt><dd>{money.format(parcel.increase)}</dd></div>
    </dl>
    {parcel.area !== "millstadt" && <p className={styles.note}>The county’s 2025 report does not list a separate ambulance tax for this fire district. This estimate starts at $0.</p>}
  </div>;
}

export default function AddressDirectory({ directory, initialPin }: { directory: ElectionDirectory; initialPin?: string }) {
  const initial = directory.addresses.find(a => a.parcels.some(p => p.pin === initialPin));
  const [view, setView] = useState<"street" | "subdivision">("street");
  const [query, setQuery] = useState("");
  const [street, setStreet] = useState(initial?.street ?? "");
  const [subdivision, setSubdivision] = useState("");
  const [openAddress, setOpenAddress] = useState<string | null>(initial?.id ?? null);
  const [openParcel, setOpenParcel] = useState<string | null>(null);
  const addressMap = useMemo(() => new Map(directory.addresses.map(a => [a.id, a])), [directory]);
  const search = normalize(query);
  const matches = (address: DirectoryAddress) => !search || normalize(`${address.address} ${address.city}`).includes(search) || address.parcels.some(p => p.pin.includes(search));
  const matchingStreets = directory.streets.filter(s => normalize(s.name).includes(search) || s.addressIds.some(id => matches(addressMap.get(id)!)));
  const matchingGroups = directory.groups.filter(g => normalize(g.name).includes(search));
  const chosenStreet = directory.streets.find(s => s.name === street);
  const chosenGroup = directory.groups.find(g => g.id === subdivision);
  const addresses = (view === "street" ? chosenStreet?.addressIds ?? [] : chosenGroup?.addressIds ?? [])
    .map(id => addressMap.get(id)!).filter(a => view !== "street" || matches(a));

  useEffect(() => {
    const restore = () => {
      const pin = new URLSearchParams(window.location.search).get("address");
      const address = directory.addresses.find(a => a.parcels.some(p => p.pin === pin));
      setView("street"); setQuery(""); setSubdivision(""); setStreet(address?.street ?? ""); setOpenAddress(address?.id ?? null); setOpenParcel(null);
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [directory]);

  function clearAddress() {
    setOpenAddress(null); setOpenParcel(null);
    window.history.replaceState(null, "", "/election-information/address-directory");
  }
  function changeView(next: "street" | "subdivision") {
    setView(next); setQuery(""); setStreet(""); setSubdivision(""); clearAddress();
  }
  function toggleAddress(address: DirectoryAddress) {
    const next = openAddress === address.id ? null : address.id;
    setOpenAddress(next); setOpenParcel(null);
    window.history.pushState(null, "", `/election-information/address-directory${next ? `?address=${address.id}` : ""}`);
  }

  return <div className={`${styles.directory} wrap`}>
    <section className={styles.finder} aria-label="Find your address">
      <div className={styles.methods} role="group" aria-label="Find an address by">
        <button type="button" aria-pressed={view === "street"} onClick={() => changeView("street")}>Street</button>
        <button type="button" aria-pressed={view === "subdivision"} onClick={() => changeView("subdivision")}>Subdivision</button>
      </div>
      <div className={styles.fields}>
        <div>
          <label htmlFor="directory-search">{view === "street" ? "Search by street or house number" : "Search by subdivision name"}</label>
          <input id="directory-search" type="search" value={query} placeholder={view === "street" ? "For example: Wyndridge or 204" : "For example: Wyndrose"} autoComplete="off" onChange={event => { setQuery(event.target.value); setStreet(""); setSubdivision(""); clearAddress(); }} />
        </div>
        <div>
          <label htmlFor="directory-choice">{view === "street" ? "Choose your street" : "Choose your subdivision"}</label>
          {view === "street" ? <select id="directory-choice" value={street} onChange={event => { setStreet(event.target.value); clearAddress(); }}>
            <option value="">Select a street</option>
            {matchingStreets.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select> : <select id="directory-choice" value={subdivision} onChange={event => { setSubdivision(event.target.value); clearAddress(); }}>
            <option value="">Select a subdivision</option>
            <optgroup label="Subdivisions">{matchingGroups.filter(g => g.kind === "subdivision").map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</optgroup>
            <optgroup label="Other county areas">{matchingGroups.filter(g => g.kind === "area").map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</optgroup>
          </select>}
        </div>
      </div>
      {search && !(view === "street" ? matchingStreets.length : matchingGroups.length) && <p className={styles.note} role="status">No match. Try fewer words or check the spelling.</p>}
    </section>

    {(view === "street" ? chosenStreet : chosenGroup) && <section className={styles.addresses} aria-labelledby="address-heading">
      <div className={styles.addressHeading}>
        <h2 id="address-heading">Choose your address</h2>
        {view === "subdivision" && chosenGroup && <a className={styles.download} href={`/api/election-directory/download/${chosenGroup.id}`}>Download Excel sheet</a>}
      </div>
      {addresses.map(address => {
        const open = openAddress === address.id;
        const shared = address.parcels.length > 1;
        return <div key={address.id} className={styles.address}>
          <a className={styles.addressLink} href={`?address=${address.id}`} aria-expanded={open} aria-controls={`address-${address.id}`} onClick={event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); toggleAddress(address); }}>
            <span><strong>{address.address}</strong><small>{address.city}</small></span><span aria-hidden="true">{open ? "−" : "+"}</span>
          </a>
          {open && <div id={`address-${address.id}`} className={styles.addressContent}>
            {shared ? <>
              <p className={styles.shared}>County records list <strong>{address.parcels.length} parcels</strong> at this address. A parcel is a piece of property with its own tax number.</p>
              <p className={styles.parcelPrompt}>Choose the number on your tax bill.</p>
              {address.parcels.map(parcel => <div className={styles.parcel} key={parcel.pin}>
                <button type="button" className={styles.parcelButton} aria-expanded={openParcel === parcel.pin} aria-controls={`parcel-${parcel.pin}`} onClick={() => setOpenParcel(openParcel === parcel.pin ? null : parcel.pin)}><span>Parcel {parcel.parcel}</span><span aria-hidden="true">{openParcel === parcel.pin ? "−" : "+"}</span></button>
                {openParcel === parcel.pin && <div id={`parcel-${parcel.pin}`}><ParcelAmounts parcel={parcel} /></div>}
              </div>)}
              <details className={styles.help}><summary>More than one parcel on your bills?</summary><p>Add the amounts for the parcels that belong to your property. Each estimate above covers only the parcel number shown.</p></details>
            </> : <ParcelAmounts parcel={address.parcels[0]} />}
          </div>}
        </div>;
      })}
    </section>}

    <div className={styles.footer}>
      <p>Can’t find your address? <a href="/election-information#ems-tax-calculator">Use the tax calculator.</a></p>
      <details className={styles.help}>
        <summary>How we figured these amounts</summary>
        <p>These are yearly estimates using the county’s 2025 tax values. Street names and subdivisions follow the county records.</p>
        <p>The ESD estimate uses the planned 0.30% rate. In the Millstadt Fire Protection District, the comparison starts with the existing 0.09% ambulance tax. It assumes that tax ends when the ESD tax begins.</p>
        <p>The county’s 2025 report does not list a separate ambulance tax for the Hecker and Waterloo fire districts, so those estimates start at $0.</p>
        <p>Your final bill can change if your property’s tax value, tax breaks or tax rates change.</p>
      </details>
    </div>
  </div>;
}
