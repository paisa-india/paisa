import {readFile,writeFile,mkdir,rename,open,unlink} from 'node:fs/promises';
import path from 'node:path';
import {sha256} from '../../packages/provenance/index';
import {parseCga} from './index';
import type {Source,Dataset} from '../../packages/schema/index';
/** Only this fixed authority is fetched; a caller cannot supply an arbitrary URL. */
export async function collectCga(root:string){
 const data=path.join(root,'data'),now=new Date().toISOString();
 await mkdir(path.join(data,'alerts'),{recursive:true});
 const lock=await open(path.join(data,'.ingest.lock'),'wx');
 try{
  const previous:Source=JSON.parse(await readFile(path.join(data,'snapshots/cga.json'),'utf8'));
  const index=await fetch('https://cga.nic.in/MonthlyReport/Published/8/2026-2027.aspx',{signal:AbortSignal.timeout(30000)});
  if(!index.ok)throw new Error(`CGA index HTTP ${index.status}`);
  const html=await index.text();const links=[...html.matchAll(/MonthlyReport\/Published\/(\d{1,2})\/2026-2027\.aspx/gi)].map(m=>Number(m[1]));
  const ordered=links.map(month=>({month,order:(month+8)%12})).sort((a,b)=>b.order-a.order);
  let reportPage=html;
  if(ordered[0]&&ordered[0].month!==8){const response=await fetch(`https://cga.nic.in/MonthlyReport/Published/${ordered[0].month}/2026-2027.aspx`,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error('CGA latest month unavailable');reportPage=await response.text();}
  const relative=/<iframe[^>]+src=['"]([^'"]+MonthAccount[^'"]+)['"]/i.exec(reportPage)?.[1];if(!relative)throw new Error('CGA iframe schema changed');
  const url=new URL(relative,'https://cga.nic.in');url.search='';if(url.origin!=='https://cga.nic.in'||!url.pathname.startsWith('/writereaddata/MonthAccount/'))throw new Error('CGA source outside allowlist');
  const headers:Record<string,string>={'User-Agent':'Paisa/0.1 public-accounts-collector'};
  if(url.href===previous.url){if(previous.httpMetadata.etag)headers['If-None-Match']=previous.httpMetadata.etag;if(previous.httpMetadata['last-modified'])headers['If-Modified-Since']=previous.httpMetadata['last-modified'];}
  const response=await fetch(url,{headers,redirect:'error',signal:AbortSignal.timeout(30000)});
  if(response.status===304){await writeFile(path.join(data,'cga-health.json'),JSON.stringify({status:'healthy',lastCheck:now,lastSuccess:previous.retrievedAt,unchanged:true}));return;}
  if(!response.ok)throw new Error(`CGA HTTP ${response.status}`);
  const raw=new Uint8Array(await response.arrayBuffer());if(raw.length>5000000)throw new Error('CGA source too large');const hash=sha256(raw);
  const file=path.join(data,'snapshots',`${hash}.html`);try{await writeFile(file,raw,{flag:'wx',mode:0o444});}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;if(sha256(await readFile(file))!==hash)throw new Error('CGA stored snapshot corrupted');}
  let source:Source={...previous,url:url.href,sha256:hash,path:`data/snapshots/${hash}.html`,retrievedAt:now,httpMetadata:Object.fromEntries(response.headers),parserVersion:'cga/1.0.0'};
  const records=parseCga(raw,source);source={...source,datasetVersion:records[0].period};
  const old:Dataset=JSON.parse(await readFile(path.join(data,'published.json'),'utf8'));
  const next={...old,publishedAt:now,records:[...old.records.filter(r=>r.sourceId!=='cga'),...records],sources:[...old.sources.filter(s=>s.id!=='cga'),source]};
  const temp=path.join(data,'cga-published.tmp');await writeFile(temp,JSON.stringify(next,null,2));await rename(temp,path.join(data,'published.json'));
  await writeFile(path.join(data,'snapshots/cga.json'),JSON.stringify(source,null,2));await writeFile(path.join(data,'cga-health.json'),JSON.stringify({status:'healthy',lastSuccess:now,lastCheck:now,recordCount:records.length}));
 }catch(error){let previous={lastSuccess:null};try{previous=JSON.parse(await readFile(path.join(data,'cga-health.json'),'utf8'));}catch{}const reason=error instanceof Error?error.message:'Unknown error';await writeFile(path.join(data,'cga-health.json'),JSON.stringify({...previous,status:'degraded',lastCheck:now,reason}));await writeFile(path.join(data,'alerts',`cga-${now.replaceAll(':','-')}.md`),`# CGA connector degraded\n\n${reason}\n\nNo new records published. Last verified data retained.`);throw error;}finally{await lock.close();await unlink(path.join(data,'.ingest.lock'));}
}
