import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { publicFinancialDocumentLibrary } from "../lib/financials-hub/public-library";
import { BILLING_ROWS, matchesSearch, documentSearchText, PENDING_SEARCH, reportHref } from "../lib/financials-hub/transparency-content";
import { TAX_COMPUTATION_DATA } from "../lib/financials-hub/tax-computation-data";
import { notifyCrash, parseCrashInput, CRASH_SUMMARY, type CrashNotice } from "../lib/financials-hub/crash-reporting";

const documents=publicFinancialDocumentLibrary();
test("certified 2025 ambulance extension and correction disclosure are used",()=>{
  const overview=readFileSync("app/financials-information-hub/FinancialOverview.tsx","utf8");
  assert.ok(overview.includes("2025 Certified Ambulance Tax Extension"));
  assert.ok(overview.includes("$278,363.25"));
  assert.ok(overview.includes("Corrected August 29, 2026 at 4:04 PM CDT"));
  assert.ok(overview.includes("combined total of three distributions"));
  assert.ok(overview.includes("page 57"));
  assert.ok(!overview.includes("Fire District Support"));
});
test("canonical library has 54 unique documents including the verified FY 2024–2025 return and FDMI sheet",()=>{
  assert.equal(documents.length,54);
  assert.equal(new Set(documents.map(d=>d.downloadUrl)).size,54);
  assert.equal(documents.filter(d=>d.kind==="form_990").length,23);
  assert.equal(documents.filter(d=>d.kind==="irs_record").length,1);
  assert.ok(!documents.some(d=>d.kind==="form_990"&&[2018,2026].includes(d.filingYear!)));
  assert.ok(documents.every(d=>!d.attachmentOf));
});
test("both fiscal-year dash variants match pending and both 2025–2026 reports",()=>{
  for(const query of ["2025-2026","2025–2026"]){
    assert.ok(matchesSearch(PENDING_SEARCH,query));
    assert.deepEqual(documents.filter(d=>matchesSearch(documentSearchText(d),query)).map(d=>d.employee).sort(),["Jennifer Goetz","Kenneth James"]);
  }
});
test("tax years, certified rates and EAV are searchable independently",()=>{
  for(const d of documents.filter(d=>d.kind==="tax_computation")) {
    assert.ok(matchesSearch(documentSearchText(d),String(d.filingYear)));
    assert.ok(matchesSearch(documentSearchText(d),d.taxData!.certifiedRate));
    assert.ok(matchesSearch(documentSearchText(d),"Rate Setting EAV"));
    assert.ok(matchesSearch(documentSearchText(d),d.taxData!.rateSettingEav));
  }
});
test("file metadata and genuine attachment titles are indexed",()=>{
  assert.equal(documents.filter(d=>matchesSearch(documentSearchText(d),'PDF')).length,54);
  const attachment={...documents[0],title:'Approved annual attachment',attachmentOf:'source-parent'};
  assert.ok(matchesSearch(documentSearchText(attachment),'Approved annual attachment'));
  assert.ok(matchesSearch(documentSearchText(attachment),'Attachments'));
});
test("tax data preserves the visually checked source row and exact precision",()=>{
  const extracted=JSON.parse(readFileSync("scripts/fixtures/financials-tax-source-extraction.json","utf8"));
  assert.equal(TAX_COMPUTATION_DATA.length,22);
  for(const data of TAX_COMPUTATION_DATA){
    const original=extracted.find((r:{year:number})=>r.year===data.year);
    const values=original.row.trim().split(/\s+/).slice(2);
    assert.equal(data.certifiedRate,values[4]);
    assert.equal(data.extensionAfterTifEz,values[6]);
    assert.equal(data.rateSettingEav,original.eav.trim().split(/\s+/).at(-1));
    assert.equal(data.sourcePage,Number(original.printedPage));
  }
  assert.equal(TAX_COMPUTATION_DATA[0].certifiedRate,"0.0900");
  assert.equal(TAX_COMPUTATION_DATA[0].extensionAfterTifEz,"$278,363.25");
  assert.equal(TAX_COMPUTATION_DATA[0].rateSettingEav,"309,292,503");
});
test("billing arithmetic and exact supplied revenues",()=>{
  assert.deepEqual(BILLING_ROWS.map(r=>r.revenue),["$296,850.31","$356,491.15","$598,688.61"]);
  for(const r of BILLING_ROWS)assert.equal(Number(r.runs.replaceAll(",",""))-Number(r.transfers),Number(r.nonTransfer));
});
test("four management PDFs match the verified supplied-source hashes",()=>{
  const sha=(path:string)=>createHash("sha256").update(readFileSync(path)).digest("hex");
  // Captured from the exact supplied PDFs after byte-for-byte verification.
  const approvedHashes:Record<string,string>={
    "KJ FY 25 26.pdf":"48884bec0dff71d10f28a2381f3ba88d096ad7188b1a7712906434fad87d755b",
    "KJ FY 24 25.pdf":"ef2fcf88b2281c0058a0224ebeb5bb736341af7c4de4974ecda7783381a1ab71",
    "JG FY 25 26.pdf":"fa07379f256ca6da3a968b6375fff03aaa6a044d50886f11cdba0b371e49cadb",
    "JG FY 24 25.pdf":"df0c92b77c9f08d9380a2dea5f91fe284e4dc50a8092f582808f0ff04e14a54f",
  };
  for(const d of documents.filter(d=>d.kind==="management_pay")){
    const prefix=d.employee==="Kenneth James"?"KJ":"JG";
    const suffix=d.filingYear===2026?"25 26":"24 25";
    assert.equal(approvedHashes[`${prefix} FY ${suffix}.pdf`],sha("public"+d.downloadUrl));
    assert.equal(d.pageCount,d.employee==="Kenneth James"&&d.filingYear===2025?2:3);
  }
});
test("reports are correctly encoded drafts to the approved recipient",()=>{
  for(const document of [...documents,undefined]) {
    const link=new URL(reportHref(document));
    assert.equal(link.pathname,"webdev@millstadtems.org");
    assert.ok(link.searchParams.get("body")?.includes("https://www.millstadtems.org/financials-information-hub"));
    if(document)assert.ok(link.searchParams.get("subject")?.includes(document.title));
  }
});
test("crash input rejects private payload fields and arbitrary browser strings",()=>{
  assert.deepEqual(parseCrashInput({browserClass:"Safari"}),{browserClass:"Safari"});
  assert.equal(parseCrashInput({browserClass:"Safari",stack:"secret"}),null);
  assert.equal(parseCrashInput({browserClass:"token?secret=1"}),null);
});
test("crash reporting is deduplicated, bounded and mocked; no real email",async()=>{
  const notices:CrashNotice[]=[];const reservations=new Set<string>();let now=0;
  const dependencies={enabled:true,release:"safe-build",now:()=>now,newId:()=>"mock-error-id",reserve:async(key:string)=>{if(reservations.has(key))return false;reservations.add(key);return true;},send:async(notice:CrashNotice)=>{notices.push(notice);}};
  assert.equal((await notifyCrash({browserClass:"Chrome"},dependencies)).status,"sent");
  assert.equal((await notifyCrash({browserClass:"Firefox"},dependencies)).status,"deduplicated");
  assert.equal(notices.length,1);assert.equal(notices[0].summary,CRASH_SUMMARY);
  assert.deepEqual(Object.keys(notices[0]).sort(),["browserClass","errorId","publicRoute","release","summary","timestamp"]);
  now=900001;assert.equal((await notifyCrash({browserClass:"Other"},dependencies)).status,"sent");
  assert.equal((await notifyCrash({browserClass:"Other"},{...dependencies,enabled:false})).status,"disabled");
  assert.equal((await notifyCrash({browserClass:"Other"},{...dependencies,reserve:async()=>{throw Error("no db");}})).status,"unavailable");
  assert.equal((await notifyCrash({browserClass:"Other"},{...dependencies,reserve:async()=>true,send:async()=>{throw Error("mail failure");}})).status,"unavailable");
});
test("original live endpoint and 60-second refresh are preserved",()=>{
  const source=readFileSync("app/financials-information-hub/AnnualCallSummary.tsx","utf8");
  assert.match(source,/fetch\("\/api\/cad\/log", \{ cache: "no-store" \}\)/);
  assert.match(source,/setInterval\(loadCurrentCalls, 60_000\)/);
  assert.match(source,/setCurrentCalls\(calls.length\)/);
  assert.ok(!source.includes("599"));
});
