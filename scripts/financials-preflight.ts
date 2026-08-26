import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { publicFinancialDocumentLibrary } from '../lib/financials-hub/public-library';

const root = resolve('work/financials-verification');
mkdirSync(root, {recursive:true});
function inspect(path: string) {
  try {
    const info = execFileSync('pdfinfo', [path], {encoding:'utf8', timeout:5000, stdio:['ignore','pipe','pipe']});
    const text = execFileSync('pdftotext', ['-f','1','-l','1','-layout',path,'-'], {encoding:'utf8', timeout:5000});
    return {status:'readable', pages:Number(info.match(/^Pages:\s+(\d+)/m)?.[1]), sha256:createHash('sha256').update(readFileSync(path)).digest('hex'), firstPage:text};
  } catch { return {status:'blocked: PDF cannot currently be read',pages:null}; }
}
const rows: Record<string, unknown>[] = publicFinancialDocumentLibrary().map(d=>({
  id:d.id, canonicalPath:d.downloadUrl.startsWith('/')?resolve('public'+d.downloadUrl):d.downloadUrl,
  publicTitle:d.title, year:d.filingYear, employee:null, role:d.kind,
  ...(d.downloadUrl.startsWith('/')?inspect(resolve('public'+d.downloadUrl)):{status:'source URL identified; values not yet verified',pages:null}),
}));
for (const [file,employee,year] of [
  ['KJ FY 25 26.pdf','Kenneth James','2025–2026'],['KJ FY 24 25.pdf','Kenneth James','2024–2025'],
  ['JG FY 25 26.pdf','Jennifer Goetz','2025–2026'],['JG FY 24 25.pdf','Jennifer Goetz','2024–2025'],
]) {
  const path='/Users/kj/Desktop/Millstadt_EMS_Compensation_Reports_Clean_PDFs (1)/'+file;
  rows.push({canonicalPath:path,publicTitle:null,requestedFilename:file,employee,year,role:'approved management report',...inspect(path)});
}
rows.push({canonicalPath:'/Users/kj/Downloads/ChatGPT Image Aug 25, 2026, 07_19_32 PM.png',publicTitle:'Get Out & Vote artwork',role:'supplied civic-resource artwork',year:null,employee:null,pages:null,status:'exact user-supplied image; preserve intact (Yaps unavailable)'});
writeFileSync(root+'/preflight.json',JSON.stringify({baseline:'381e0e84e4838dfa398daef6cc8c55437741cd0b',liveBinding:{component:'app/financials-information-hub/AnnualCallSummary.tsx',url:'/api/cad/log',intervalMs:60000,calculation:'array.length'},documents:rows},null,2));
console.log(rows.map(({id,requestedFilename,pages,status})=>({source:id??requestedFilename,pages,status})));
