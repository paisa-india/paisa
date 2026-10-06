import {inflateRawSync} from 'node:zlib';
/** Minimal read-only XLSX reader: first worksheet, shared strings and plain values. No formulas are evaluated. */
export function unzip(raw:Uint8Array){
 const buf=Buffer.from(raw);const files=new Map<string,Buffer>();
 let eocd=-1;for(let i=buf.length-22;i>=Math.max(0,buf.length-65557);i--)if(buf.readUInt32LE(i)===0x06054b50){eocd=i;break;}
 if(eocd<0)throw new Error('Not a ZIP/XLSX file');
 const count=buf.readUInt16LE(eocd+10);let p=buf.readUInt32LE(eocd+16);
 for(let n=0;n<count;n++){
  if(buf.readUInt32LE(p)!==0x02014b50)throw new Error('Corrupt ZIP directory');
  const method=buf.readUInt16LE(p+10),size=buf.readUInt32LE(p+20),nameLen=buf.readUInt16LE(p+28),extra=buf.readUInt16LE(p+30),comment=buf.readUInt16LE(p+32),local=buf.readUInt32LE(p+42);
  const name=buf.subarray(p+46,p+46+nameLen).toString('utf8');
  const start=local+30+buf.readUInt16LE(local+26)+buf.readUInt16LE(local+28);const data=buf.subarray(start,start+size);
  if(method!==0&&method!==8)throw new Error(`Unsupported ZIP method ${method}`);
  files.set(name,method===8?inflateRawSync(data):data);p+=46+nameLen+extra+comment;
 }
 return files;
}
const decode=(s:string)=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
/** Returns cells keyed by "A1"-style reference, as raw strings exactly as stored. */
export function readSheet(raw:Uint8Array):Map<string,string>{
 const files=unzip(raw);const sheet=files.get('xl/worksheets/sheet1.xml')?.toString('utf8');if(!sheet)throw new Error('No first worksheet');
 const shared=[...(files.get('xl/sharedStrings.xml')?.toString('utf8')??'').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m=>decode([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(t=>t[1]).join('')));
 const cells=new Map<string,string>();
 for(const m of sheet.matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){
  const v=/<v>([\s\S]*?)<\/v>/.exec(m[3]??'')?.[1];if(v===undefined)continue;
  cells.set(m[1],/t="s"/.test(m[2])?shared[Number(v)]??'':/t="inlineStr"/.test(m[2])?decode(v):v);
 }
 return cells;
}
