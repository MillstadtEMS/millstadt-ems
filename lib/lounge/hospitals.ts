/**
 * Hospital roster for Millstadt EMS. DB-backed so admins can edit door
 * codes, phone numbers, and notes from the lounge. The seed below ports
 * the original Expo app's hospitalsSeed — it's inserted on first read
 * if the lounge_hospitals table is empty, and is otherwise just a fall-
 * back source of truth.
 */
import { sql } from "./db";

export type PrimaryContactLabel = "EMS Patch" | "ED" | "Report Line";

export interface PrimaryContact {
  label: PrimaryContactLabel;
  phone: string;
}

export interface SecondaryContact {
  label: string;
  value: string;
}

export type AccessCodeKind = "ER" | "EMS Room" | "Non-ER" | "Nursing Home";

export interface AccessCode {
  kind: AccessCodeKind;
  value: string;
  note?: string;
}

export interface Hospital {
  id: string;
  name: string;
  city: string;
  state: string;
  system?: string;
  primaryContact: PrimaryContact;
  secondaryContact?: SecondaryContact;
  address: string;
  latitude: number;
  longitude: number;
  /** Single ER door code from legacy data. */
  doorCode?: string;
  /** Single EMS-room code from legacy data. */
  emsRoomCode?: string;
  /** Newer structured list (optional). */
  codes?: AccessCode[];
  twelveLeadEmail?: string;
  notes?: string;
}

// Millstadt EMS station (203 W Laurel St) — used for ETA calculations.
// Lat/lng matches the seed origin in the native app.
export const STATION_LAT = 38.4570;
export const STATION_LNG = -90.0901;

// In-house EMS door code (the one our crew gets buzzed in with).
export const EMS_DOOR_CODE = "1234*";

export const HOSPITALS: Hospital[] = [
  { id: "anderson",   name: "Anderson Hospital",                          city: "Maryville",         state: "IL",
    primaryContact: { label: "EMS Patch", phone: "6182883810" },
    address: "6800 State Route 162, Maryville, IL 62062",
    latitude: 38.73664, longitude: -89.94622 },
  { id: "barnes",     name: "Barnes Jewish Hospital",                     city: "St. Louis",         state: "MO",
    primaryContact: { label: "ED", phone: "3143629166" },
    address: "1 Barnes Jewish Hospital Plaza, St. Louis, MO 63110",
    latitude: 38.63495, longitude: -90.26489,
    doorCode: "1212*", notes: "Elevator code: 1234#" },
  { id: "bjstpeters", name: "Barnes Jewish St. Peters",                   city: "St. Peters",        state: "MO",
    primaryContact: { label: "ED", phone: "6369287569" },
    address: "10 Hospital Dr, St Peters, MO 63376",
    latitude: 38.79394, longitude: -90.58099 },
  { id: "christian",  name: "Christian Hospital",                         city: "St. Louis",         state: "MO",
    primaryContact: { label: "ED", phone: "3146535983" },
    address: "11133 Dunn Rd, St Louis, MO 63136",
    latitude: 38.7764,  longitude: -90.24193 },
  { id: "mem-belleville", name: "Memorial Hospital Belleville",           city: "Belleville",        state: "IL",
    primaryContact: { label: "EMS Patch", phone: "6182334598" },
    address: "4500 Memorial Dr, Belleville, IL 62226",
    latitude: 38.54995, longitude: -90.02146,
    twelveLeadEmail: "mem-carepoint@bjc.org" },
  { id: "mem-shiloh", name: "Memorial Hospital Shiloh",                   city: "Shiloh",            state: "IL",
    primaryContact: { label: "EMS Patch", phone: "6186228358" },
    address: "1404 Cross St, Shiloh, IL 62263",
    latitude: 38.57368, longitude: -89.90539,
    twelveLeadEmail: "gs-mhecarepoint@bjc.org" },
  { id: "mobap",      name: "Missouri Baptist Medical Center",            city: "St. Louis",         state: "MO",
    primaryContact: { label: "EMS Patch", phone: "3144320560" },
    address: "3015 N Ballas Rd, St Louis, MO 63131",
    latitude: 38.636,   longitude: -90.44664,
    doorCode: "#1#  ·  *1234*" },
  { id: "progresswest", name: "Progress West Hospital",                   city: "O’Fallon",     state: "MO",
    primaryContact: { label: "EMS Patch", phone: "6363441134" },
    address: "2 Progress Point Pkwy, O Fallon, MO 63368",
    latitude: 38.7158,  longitude: -90.69436 },
  { id: "slch",       name: "St. Louis Children's Hospital",              city: "St. Louis",         state: "MO",
    primaryContact: { label: "EMS Patch", phone: "3144542072" },
    address: "1 Children's Place, St Louis, MO 63110",
    latitude: 38.63658, longitude: -90.26255 },
  { id: "steliz",     name: "HSHS St. Elizabeth Hospital",                city: "O’Fallon",     state: "IL",
    primaryContact: { label: "EMS Patch", phone: "6186415436" },
    address: "1 St Elizabeth Blvd, O Fallon, IL 62269",
    latitude: 38.58409, longitude: -89.93245,
    twelveLeadEmail: "carepoint-seo@hshs.gdcarepoint.com" },
  { id: "gateway",    name: "Gateway Regional Medical Center",            city: "Granite City",      state: "IL",
    primaryContact: { label: "EMS Patch", phone: "6187983678" },
    address: "2100 Madison Ave, Granite City, IL 62040",
    latitude: 38.69921, longitude: -90.16127,
    doorCode: "911*" },
  { id: "va",         name: "John Cochran VA Medical Center",             city: "St. Louis",         state: "MO",
    primaryContact: { label: "ED", phone: "3142896410" },
    address: "915 N Grand Blvd, St Louis, MO 63106",
    latitude: 38.64213, longitude: -90.23094 },
  { id: "depaul",     name: "SSM DePaul Hospital",                        city: "Bridgeton",         state: "MO",
    primaryContact: { label: "EMS Patch", phone: "3143440888" },
    address: "12303 De Paul Dr, Bridgeton, MO 63044",
    latitude: 38.75068, longitude: -90.4333,
    doorCode: "1911*" },
  { id: "glennon",    name: "SSM Cardinal Glennon Children's Hospital",   city: "St. Louis",         state: "MO",
    primaryContact: { label: "EMS Patch", phone: "3145775377" },
    address: "1465 S Grand Blvd, St Louis, MO 63104",
    latitude: 38.62055, longitude: -90.23952,
    doorCode: "#5666#" },
  { id: "stclare",    name: "SSM St. Clare Hospital",                     city: "Fenton",            state: "MO",
    primaryContact: { label: "EMS Patch", phone: "6364962199" },
    address: "1015 Bowles Ave, Fenton, MO 63026",
    latitude: 38.52791, longitude: -90.47595,
    doorCode: "*1*", emsRoomCode: "5512" },
  { id: "stj-lsl",    name: "SSM St. Joseph Lake St. Louis",              city: "Lake St. Louis",    state: "MO",
    primaryContact: { label: "EMS Patch", phone: "6366255301" },
    address: "100 Medical Plaza, Lake St Louis, MO 63367",
    latitude: 38.8028,  longitude: -90.77549,
    doorCode: "9110*" },
  { id: "stj-stc",    name: "SSM St. Joseph St. Charles",                 city: "St. Charles",       state: "MO",
    primaryContact: { label: "EMS Patch", phone: "6369475115" },
    address: "300 1st Capitol Dr, St Charles, MO 63301",
    latitude: 38.78046, longitude: -90.48376,
    doorCode: "*524#" },
  { id: "stmarys",    name: "SSM St. Mary's Hospital",                    city: "Richmond Heights",  state: "MO",
    primaryContact: { label: "EMS Patch", phone: "3147688986" },
    address: "6420 Clayton Rd, Richmond Heights, MO 63117",
    latitude: 38.63307, longitude: -90.31118,
    doorCode: "911*" },
  { id: "touchette",  name: "Touchette Regional Hospital",                city: "East St. Louis",    state: "IL",
    primaryContact: { label: "EMS Patch", phone: "6183325368" },
    address: "5900 Bond Ave, East St Louis, IL 62207",
    latitude: 38.57044, longitude: -90.10764,
    doorCode: "1159" },
  { id: "carbondale", name: "SIH Memorial Hospital Carbondale",           city: "Carbondale",        state: "IL",
    primaryContact: { label: "EMS Patch", phone: "6185290443" },
    secondaryContact: { label: "12 Lead Fax", value: "6183514996" },
    address: "405 W Jackson St, Carbondale, IL 62901",
    latitude: 37.72766, longitude: -89.22055 },
  { id: "goodsam",    name: "SSM Good Samaritan Hospital",                city: "Mt. Vernon",        state: "IL",
    primaryContact: { label: "EMS Patch", phone: "6182426534" },
    address: "1 Good Samaritan Way, Mt Vernon, IL 62864",
    latitude: 38.29713, longitude: -88.93884 },
];

export interface HospitalRecord extends Hospital {
  fax?: string | null;
  flagForReview?: boolean;
}

let schemaEnsured = false;
let seedAttempted = false;

async function ensureSchema() {
  if (schemaEnsured) return;
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS lounge_hospitals (
      id                  TEXT PRIMARY KEY,
      name                TEXT NOT NULL,
      city                TEXT NOT NULL,
      state               TEXT NOT NULL,
      system              TEXT,
      primary_label       TEXT NOT NULL DEFAULT 'EMS Patch',
      primary_phone       TEXT NOT NULL,
      secondary_label     TEXT,
      secondary_value     TEXT,
      address             TEXT NOT NULL,
      latitude            DOUBLE PRECISION NOT NULL,
      longitude           DOUBLE PRECISION NOT NULL,
      door_code           TEXT,
      ems_room_code       TEXT,
      codes               JSONB,
      twelve_lead_email   TEXT,
      fax                 TEXT,
      notes               TEXT,
      flag_for_review     BOOLEAN NOT NULL DEFAULT FALSE,
      is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  schemaEnsured = true;
}

async function seedIfEmpty() {
  if (seedAttempted) return;
  seedAttempted = true;
  await ensureSchema();
  const db = sql();
  const rows = await db`SELECT COUNT(*)::int AS c FROM lounge_hospitals` as unknown as { c: number }[];
  if ((rows[0]?.c ?? 0) > 0) return;
  for (const h of HOSPITALS) {
    await db`
      INSERT INTO lounge_hospitals
        (id, name, city, state, primary_label, primary_phone,
         secondary_label, secondary_value, address, latitude, longitude,
         door_code, ems_room_code, codes, twelve_lead_email, notes)
      VALUES
        (${h.id}, ${h.name}, ${h.city}, ${h.state},
         ${h.primaryContact.label}, ${h.primaryContact.phone},
         ${h.secondaryContact?.label ?? null}, ${h.secondaryContact?.value ?? null},
         ${h.address}, ${h.latitude}, ${h.longitude},
         ${h.doorCode ?? null}, ${h.emsRoomCode ?? null},
         ${h.codes ? JSON.stringify(h.codes) : null}::jsonb,
         ${h.twelveLeadEmail ?? null}, ${h.notes ?? null})
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

interface DbRow {
  id: string;
  name: string;
  city: string;
  state: string;
  system: string | null;
  primary_label: string;
  primary_phone: string;
  secondary_label: string | null;
  secondary_value: string | null;
  address: string;
  latitude: number;
  longitude: number;
  door_code: string | null;
  ems_room_code: string | null;
  codes: AccessCode[] | null;
  twelve_lead_email: string | null;
  fax: string | null;
  notes: string | null;
  flag_for_review: boolean;
  is_deleted: boolean;
}

function rowToHospital(r: DbRow): HospitalRecord {
  return {
    id: r.id,
    name: r.name,
    city: r.city,
    state: r.state,
    system: r.system ?? undefined,
    primaryContact: { label: r.primary_label as PrimaryContactLabel, phone: r.primary_phone },
    secondaryContact: r.secondary_label && r.secondary_value
      ? { label: r.secondary_label, value: r.secondary_value }
      : undefined,
    address: r.address,
    latitude: r.latitude,
    longitude: r.longitude,
    doorCode: r.door_code ?? undefined,
    emsRoomCode: r.ems_room_code ?? undefined,
    codes: r.codes ?? undefined,
    twelveLeadEmail: r.twelve_lead_email ?? undefined,
    fax: r.fax ?? undefined,
    notes: r.notes ?? undefined,
    flagForReview: r.flag_for_review,
  };
}

export async function listHospitalsLive(): Promise<HospitalRecord[]> {
  await seedIfEmpty();
  const db = sql();
  const rows = (await db`
    SELECT * FROM lounge_hospitals WHERE is_deleted = FALSE ORDER BY name ASC
  `) as unknown as DbRow[];
  return rows.map(rowToHospital);
}

export async function getHospitalLive(id: string): Promise<HospitalRecord | null> {
  await seedIfEmpty();
  const db = sql();
  const rows = (await db`SELECT * FROM lounge_hospitals WHERE id = ${id} LIMIT 1`) as unknown as DbRow[];
  return rows[0] ? rowToHospital(rows[0]) : null;
}

export interface HospitalPatch {
  name?: string;
  city?: string;
  state?: string;
  system?: string | null;
  primaryLabel?: string;
  primaryPhone?: string;
  secondaryLabel?: string | null;
  secondaryValue?: string | null;
  address?: string;
  latitude?: number;
  longitude?: number;
  doorCode?: string | null;
  emsRoomCode?: string | null;
  codes?: AccessCode[] | null;
  twelveLeadEmail?: string | null;
  fax?: string | null;
  notes?: string | null;
  flagForReview?: boolean;
}

export async function updateHospital(id: string, patch: HospitalPatch): Promise<HospitalRecord | null> {
  await ensureSchema();
  const db = sql();
  if (patch.name !== undefined)
    await db`UPDATE lounge_hospitals SET name = ${patch.name}, updated_at = NOW() WHERE id = ${id}`;
  if (patch.city !== undefined)
    await db`UPDATE lounge_hospitals SET city = ${patch.city}, updated_at = NOW() WHERE id = ${id}`;
  if (patch.state !== undefined)
    await db`UPDATE lounge_hospitals SET state = ${patch.state}, updated_at = NOW() WHERE id = ${id}`;
  if (patch.system !== undefined)
    await db`UPDATE lounge_hospitals SET system = ${patch.system}, updated_at = NOW() WHERE id = ${id}`;
  if (patch.primaryLabel !== undefined)
    await db`UPDATE lounge_hospitals SET primary_label = ${patch.primaryLabel}, updated_at = NOW() WHERE id = ${id}`;
  if (patch.primaryPhone !== undefined)
    await db`UPDATE lounge_hospitals SET primary_phone = ${patch.primaryPhone}, updated_at = NOW() WHERE id = ${id}`;
  if (patch.secondaryLabel !== undefined)
    await db`UPDATE lounge_hospitals SET secondary_label = ${patch.secondaryLabel}, updated_at = NOW() WHERE id = ${id}`;
  if (patch.secondaryValue !== undefined)
    await db`UPDATE lounge_hospitals SET secondary_value = ${patch.secondaryValue}, updated_at = NOW() WHERE id = ${id}`;
  if (patch.address !== undefined)
    await db`UPDATE lounge_hospitals SET address = ${patch.address}, updated_at = NOW() WHERE id = ${id}`;
  if (patch.latitude !== undefined)
    await db`UPDATE lounge_hospitals SET latitude = ${patch.latitude}, updated_at = NOW() WHERE id = ${id}`;
  if (patch.longitude !== undefined)
    await db`UPDATE lounge_hospitals SET longitude = ${patch.longitude}, updated_at = NOW() WHERE id = ${id}`;
  if (patch.doorCode !== undefined)
    await db`UPDATE lounge_hospitals SET door_code = ${patch.doorCode}, updated_at = NOW() WHERE id = ${id}`;
  if (patch.emsRoomCode !== undefined)
    await db`UPDATE lounge_hospitals SET ems_room_code = ${patch.emsRoomCode}, updated_at = NOW() WHERE id = ${id}`;
  if (patch.codes !== undefined)
    await db`UPDATE lounge_hospitals SET codes = ${patch.codes ? JSON.stringify(patch.codes) : null}::jsonb, updated_at = NOW() WHERE id = ${id}`;
  if (patch.twelveLeadEmail !== undefined)
    await db`UPDATE lounge_hospitals SET twelve_lead_email = ${patch.twelveLeadEmail}, updated_at = NOW() WHERE id = ${id}`;
  if (patch.fax !== undefined)
    await db`UPDATE lounge_hospitals SET fax = ${patch.fax}, updated_at = NOW() WHERE id = ${id}`;
  if (patch.notes !== undefined)
    await db`UPDATE lounge_hospitals SET notes = ${patch.notes}, updated_at = NOW() WHERE id = ${id}`;
  if (patch.flagForReview !== undefined)
    await db`UPDATE lounge_hospitals SET flag_for_review = ${patch.flagForReview}, updated_at = NOW() WHERE id = ${id}`;
  return getHospitalLive(id);
}

export interface CreateHospitalInput {
  id?: string;
  name: string;
  city: string;
  state: string;
  primaryLabel: string;
  primaryPhone: string;
  address: string;
  latitude: number;
  longitude: number;
}

export async function createHospital(input: CreateHospitalInput): Promise<HospitalRecord> {
  await ensureSchema();
  const db = sql();
  const id = input.id ?? `custom-${Date.now()}`;
  await db`
    INSERT INTO lounge_hospitals
      (id, name, city, state, primary_label, primary_phone, address, latitude, longitude)
    VALUES
      (${id}, ${input.name}, ${input.city}, ${input.state},
       ${input.primaryLabel}, ${input.primaryPhone}, ${input.address},
       ${input.latitude}, ${input.longitude})
  `;
  const fresh = await getHospitalLive(id);
  if (!fresh) throw new Error("Created hospital not found");
  return fresh;
}

export async function softDeleteHospital(id: string): Promise<void> {
  await ensureSchema();
  const db = sql();
  await db`UPDATE lounge_hospitals SET is_deleted = TRUE, updated_at = NOW() WHERE id = ${id}`;
}

/** Haversine distance in miles between two coords. */
export function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.7613; // earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
