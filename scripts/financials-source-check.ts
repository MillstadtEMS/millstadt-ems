import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { publicFinancialDocumentLibrary } from '../lib/financials-hub/public-library';

const root='work/financials-verification';
mkdirSync(root,{recursive:true});
const results=[];
for(const d of publicFinancialDocumentLibrary().filter(d=>d.kind==='tax_computation')) {
  const file=`${root}/tax-${d.filingYear}.pdf`;
  try {
    if(!existsSync(file)) execFileSync('curl',['--silent','--show-error','--fail','--location','--max-time','30',d.downloadUrl,'-o',file]);
    const page=Number(d.viewUrl.split('#page=')[1]);
    const text=execFileSync('pdftotext',['-f',String(page),'-l',String(page),'-layout',file,'-'],{encoding:'utf8'});
    const info=execFileSync('pdfinfo',[file],{encoding:'utf8'});
    writeFileSync(`${root}/tax-${d.filingYear}.txt`,text);
    execFileSync('pdftoppm',['-f',String(page),'-l',String(page),'-singlefile','-scale-to','1800','-png',file,`${root}/tax-${d.filingYear}`]);
    const row=text.split('\n').find(l=>/064\s+AMBULANCE/.test(l));
    const eav=text.split('\n').find(l=>/Total \+ Overlap/.test(l));
    const printedPage=text.match(/Page\s+(\d+)\s+of/)?.[1];
    const result={year:d.filingYear,canonicalUrl:d.downloadUrl,pages:Number(info.match(/^Pages:\s+(\d+)/m)?.[1]),printedPage,row,eav,district:text.match(/Taxing District[^\n]+/)?.[0],visuallyVerified:false};
    results.push(result); console.log(JSON.stringify(result));
  } catch(e) { results.push({year:d.filingYear,error:String(e)}); console.log('BLOCKED',d.filingYear); }
}
writeFileSync(`${root}/tax-source-extraction.json`,JSON.stringify(results,null,2));
const preflight=JSON.parse(readFileSync(`${root}/preflight.json`,'utf8'));
preflight.taxSourceExtraction=results;
writeFileSync(`${root}/preflight.json`,JSON.stringify(preflight,null,2));
