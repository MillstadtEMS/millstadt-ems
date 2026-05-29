/**
 * Hospital roster for Millstadt EMS. Single source of truth used by the
 * /lounge/hospitals page. Ported from the original Expo app's hospitalsSeed.
 *
 * To add or update a hospital, edit HOSPITALS below.
 */

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

/** Haversine distance in miles between two coords. */
export function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.7613; // earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
