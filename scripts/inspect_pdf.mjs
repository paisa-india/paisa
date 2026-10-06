import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
for (const id of ['bag1','bag5','bag6','bag7']) {
 const m=JSON.parse(readFileSync(`data/snapshots/${id}.json`,'utf8'));
 const doc=await getDocument({data:new Uint8Array(readFileSync(m.path)),useSystemFonts:true}).promise;
 const pages=[];
 for(let i=1;i<=doc.numPages;i++) {const p=await doc.getPage(i); const c=await p.getTextContent(); let lines=''; for(const item of c.items) if('str' in item) lines+=item.str+(item.hasEOL?'\n':' '); pages.push(lines);}
 writeFileSync(`tmp/${id}-js.json`,JSON.stringify(pages));
}
