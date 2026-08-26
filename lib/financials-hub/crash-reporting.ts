export type BrowserClass = "Chrome" | "Edge" | "Firefox" | "Safari" | "Other";
export type CrashNotice = { errorId:string; timestamp:string; publicRoute:string; release:string; browserClass:BrowserClass; summary:string };
export const CRASH_ROUTE = "/financials-information-hub";
export const CRASH_SUMMARY = "The Financial Transparency page encountered a rendering error.";

export function parseCrashInput(input: unknown): { browserClass: BrowserClass } | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const record=input as Record<string,unknown>;
  if (Object.keys(record).some(key=>key!=="browserClass")) return null;
  const allowed=["Chrome","Edge","Firefox","Safari","Other"];
  return typeof record.browserClass==="string" && allowed.includes(record.browserClass) ? {browserClass:record.browserClass as BrowserClass} : null;
}

export async function notifyCrash(input:{browserClass:BrowserClass}, dependencies:{
  enabled:boolean; release:string; now:()=>number; newId:()=>string;
  reserve:(key:string)=>Promise<boolean>; send:(notice:CrashNotice)=>Promise<void>;
}) {
  if(!dependencies.enabled) return {status:"disabled" as const};
  const now=dependencies.now();
  // Never forward exception text, stacks, user routes, query strings, or form data.
  const release=/^[a-zA-Z0-9._-]{1,40}$/.test(dependencies.release) ? dependencies.release : "unknown";
  try {
    // One notification per release / 15-minute window, shared across instances.
    if(!await dependencies.reserve(`${release}:${Math.floor(now/900000)}`)) return {status:"deduplicated" as const};
    const notice:CrashNotice={errorId:dependencies.newId(),timestamp:new Date(now).toISOString(),publicRoute:CRASH_ROUTE,release,browserClass:input.browserClass,summary:CRASH_SUMMARY};
    await dependencies.send(notice);
    return {status:"sent" as const,errorId:notice.errorId};
  } catch { return {status:"unavailable" as const}; }
}
