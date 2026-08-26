import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { notifyCrash, parseCrashInput } from "@/lib/financials-hub/crash-reporting";
import { sendGmailMessage } from "@/lib/reports/gmail-message";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { sql } from "@/lib/neon";
import { readBoundedJson } from "@/lib/security/http";

export const runtime="nodejs";
export async function POST(request:NextRequest) {
  const enabled=process.env.VERCEL_ENV==="production" && process.env.DISABLE_OUTBOUND_EMAIL!=="true" && Boolean(process.env.GMAIL_CLIENT_ID&&process.env.GMAIL_CLIENT_SECRET&&process.env.GMAIL_REFRESH_TOKEN&&process.env.DATABASE_URL&&(process.env.SECURITY_RATE_LIMIT_KEY||process.env.ANALYTICS_HASH_KEY||process.env.LOUNGE_ENCRYPTION_KEY));
  if(!enabled) return Response.json({status:"disabled"},{status:503});
  const origin=request.headers.get("origin");
  if(origin!==request.nextUrl.origin || !request.headers.get("content-type")?.startsWith("application/json")) return Response.json({status:"invalid"},{status:403});
  try {
    const limit=await checkRateLimit(request,"financials-crash",{limit:3,windowMs:3600000});
    if(!limit.allowed) return Response.json({status:"rate-limited"},{status:429});
    const body=await readBoundedJson(request,256);
    if(!body.ok) return Response.json({status:"invalid"},{status:400});
    const input=parseCrashInput(body.value);
    if(!input) return Response.json({status:"invalid"},{status:400});
    const result=await notifyCrash(input,{
      enabled,release:(process.env.VERCEL_GIT_COMMIT_SHA||process.env.NEXT_PUBLIC_SITE_BUILD_REVISION||"unknown").slice(0,40),now:Date.now,newId:randomUUID,
      reserve:async key=>{
        const db=sql();
        await db`CREATE TABLE IF NOT EXISTS public_crash_notification_windows (window_key TEXT PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
        await db`DELETE FROM public_crash_notification_windows WHERE created_at < NOW() - INTERVAL '7 days'`;
        const rows=await db`INSERT INTO public_crash_notification_windows (window_key) VALUES (${key}) ON CONFLICT DO NOTHING RETURNING window_key`;
        return rows.length>0;
      },
      send:async notice=>{
        const text=Object.entries(notice).map(([key,value])=>`${key}: ${value}`).join("\n");
        const sent=await sendGmailMessage({fromName:"Millstadt EMS Website",to:["webdev@millstadtems.org"],subject:`Website rendering error ${notice.errorId}`,text,html:`<pre>${text}</pre>`});
        if(!sent.sent) throw new Error("Delivery disabled");
      },
    });
    return Response.json(result,{status:result.status==="unavailable"?503:200});
  } catch { return Response.json({status:"unavailable"},{status:503}); }
}
