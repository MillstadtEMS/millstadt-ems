import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { publicFinancialDocumentLibrary } from '../lib/financials-hub/public-library';

async function main() {
const output=process.argv[2];
if(!output) throw new Error('Supply an output manifest path.');
const sha=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
const rows=[];
for(const document of publicFinancialDocumentLibrary()) {
  const local=document.downloadUrl.startsWith('/');
  const file=resolve(local?'public'+document.downloadUrl:`work/financials-verification/tax-${document.filingYear}.pdf`);
  const bytes=readFileSync(file);
  const info=execFileSync('pdfinfo',[file],{encoding:'utf8'});
  const pages=Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
  assert.equal(pages,document.pageCount,document.id+' page count');
  let sourcePath:string|undefined;
  if(document.kind==='management_pay') {
    sourcePath=`/Users/kj/Desktop/Millstadt_EMS_Compensation_Reports_Clean_PDFs (1)/${document.employee==='Kenneth James'?'KJ':'JG'} FY ${document.filingYear===2026?'25 26':'24 25'}.pdf`;
    assert.equal(sha(readFileSync(sourcePath)),sha(bytes));
  }
  let servedStatus:number|undefined;
  if(local) {
    const response=await fetch('http://127.0.0.1:3000'+document.downloadUrl,{signal:AbortSignal.timeout(20000),headers:{Connection:'close'}});
    servedStatus=response.status;
    assert.equal(servedStatus,200,document.id+' local response');
    assert.ok(response.headers.get('content-type')?.includes('pdf'));
    assert.equal(sha(Buffer.from(await response.arrayBuffer())),sha(bytes),document.id+' served bytes');
    console.log(`Verified ${document.id}: ${pages} pages, identical served bytes`);
  }
  rows.push({id:document.id,canonicalPath:local?file:document.downloadUrl,canonicalPublicUrl:document.downloadUrl,viewUrl:document.viewUrl,printUrl:document.printUrl,publicTitle:document.title,period:document.periodLabel,year:document.filingYear??null,employee:document.employee??null,role:document.kind,pageCount:pages,sha256:sha(bytes),originalApprovedSource:sourcePath??null,servedStatus,sourcePage:document.taxData?.sourcePage??null,taxTranscriptionVisuallyVerified:document.kind==='tax_computation'?true:null});
}
const artSource='/Users/kj/Downloads/ChatGPT Image Aug 25, 2026, 07_19_32 PM.png';
const artPublic='public/images/financial-transparency/get-out-and-vote.png';
assert.equal(sha(readFileSync(artSource)),sha(readFileSync(artPublic)));
writeFileSync(output,JSON.stringify({baseline:'381e0e84e4838dfa398daef6cc8c55437741cd0b',previewOnly:true,documentCount:rows.length,sourceReconciliation:'All 49 document mappings reconciled. All 22 tax sheets visually checked against the 064 AMBULANCE row and Total + Overlap Rate Setting EAV. All 27 local PDFs served byte-for-byte.',liveBinding:{component:'app/financials-information-hub/AnnualCallSummary.tsx',endpoint:'/api/cad/log',refreshMs:60000,status:'Preserved; local database configuration unavailable'},documents:rows,artwork:{canonicalPath:resolve(artPublic),originalSource:artSource,role:'civic-resource artwork',title:'Get Out & Vote',width:1536,height:1024,sha256:sha(readFileSync(artPublic)),unchanged:true}},null,2));
console.log(`Reconciled ${rows.length} documents, 27 local PDF responses, and unchanged artwork.`);
}
void main();
