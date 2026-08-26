"use client";

import { useEffect, useRef } from "react";
import ReportProblem from "./ReportProblem";

export default function FinancialTransparencyError({retry,reset}:{retry?:()=>void;reset?:()=>void}) {
  const reported=useRef(false);
  useEffect(()=>{
    if(reported.current || process.env.NODE_ENV!=="production") return;
    reported.current=true;
    const agent=navigator.userAgent;
    const browserClass=/Edg\//.test(agent)?"Edge":/Chrome\//.test(agent)?"Chrome":/Firefox\//.test(agent)?"Firefox":/Safari\//.test(agent)?"Safari":"Other";
    void fetch("/api/financials/client-error",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({browserClass})}).catch(()=>{});
  },[]);
  return <section aria-labelledby="financial-error-title" style={{maxWidth:1180,margin:"3rem auto",padding:"2rem",color:"#fff"}}><h1 id="financial-error-title">Financial Transparency is temporarily unavailable</h1><p>Please try again. You can also report a technical problem.</p><button style={{minHeight:44,padding:".7rem 1rem",marginRight:16,border:"1px solid currentColor"}} type="button" onClick={()=>{const recover=retry??reset;if(recover)recover();else window.location.reload();}}>Try again</button><ReportProblem/></section>;
}
