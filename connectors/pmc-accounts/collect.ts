import {readFile,writeFile,mkdir,rename,open,unlink} from 'node:fs/promises';
import path from 'node:path';
import {sha256,saveImmutable} from '../../packages/provenance/index';
import {parsePmcPdf,validatePmc,PMC_ARTIFACT,parserVersion} from './index';
import type {Source,Dataset} from '../../packages/schema/index';
/** Checks only the pinned, reviewed artifact URL; a caller cannot supply an arbitrary URL. */
export async function collectPmc(root:string){
 const data=path.join(root,'data'),now=new Date().toISOString(),healthFile=path.join(data,'pmc-accounts-health.json');
 await mkdir(path.join(data,'alerts'),{recursive:true});
 const lock=await open(path.join(data,'.ingest.lock'),'wx');
 try{
  const manifest=path.join(data,'snapshots',`${PMC_ARTIFACT.id}.json`);const previous:Source=JSON.parse(await readFile(manifest,'utf8'));
  const url=new URL(PMC_ARTIFACT.url);if(url.origin!=='https://adc-ecos.enlightcloud.com'||!url.pathname.startsWith('/1133pmcwebsitev2/'))throw new Error('PMC source outside allowlist');
  const headers:Record<string,string>={'User-Agent':'Paisa/0.1 public-accounts-collector'};
  if(previous.httpMetadata.etag)headers['If-None-Match']=previous.httpMetadata.etag;if(previous.httpMetadata['last-modified'])headers['If-Modified-Since']=previous.httpMetadata['last-modified'];
  let response:Response|undefined;
  for(let attempt=0;attempt<3;attempt++){
   try{response=await fetch(url,{headers,redirect:'error',signal:AbortSignal.timeout(60000)});if(response.status!==429&&response.status<500)break;}catch(error){if(attempt===2)throw error;}
   await new Promise(resolve=>setTimeout(resolve,1000*2**attempt));
  }
  if(!response)throw new Error('PMC source unavailable');
  const unchanged=async()=>{await writeFile(healthFile,JSON.stringify({status:'healthy',lastCheck:now,lastSuccess:previous.retrievedAt,unchanged:true}));};
  if(response.status===304)return unchanged();
  if(!response.ok)throw new Error(`PMC HTTP ${response.status}`);
  if(!response.headers.get('content-type')?.includes('pdf'))throw new Error('Unexpected PMC content type');
  if(Number(response.headers.get('content-length')??0)>30000000)throw new Error('PMC source too large');
  const raw=new Uint8Array(await response.arrayBuffer());if(raw.length>30000000)throw new Error('PMC source too large');
  if(sha256(raw)===previous.sha256)return unchanged();
  const saved=await saveImmutable(path.join(data,'snapshots'),raw);
  const source:Source={...previous,sha256:saved.hash,path:`data/snapshots/${saved.hash}.pdf`,retrievedAt:now,httpMetadata:Object.fromEntries(response.headers),parserVersion};
  const records=await parsePmcPdf(raw,source);const checks=validatePmc(records,PMC_ARTIFACT.fiscalYear);
  const old:Dataset=JSON.parse(await readFile(path.join(data,'published.json'),'utf8'));
  const next:Dataset={...old,publishedAt:now,records:[...old.records.filter(r=>r.sourceId!==source.id),...records],sources:[...old.sources.filter(s=>s.id!==source.id),source],validations:[...old.validations.filter(v=>!v.rule.startsWith('PMC ')),...checks]};
  const temp=path.join(data,'pmc-published.tmp');await writeFile(temp,JSON.stringify(next,null,2));await rename(temp,path.join(data,'published.json'));
  await writeFile(manifest,JSON.stringify(source,null,2));await writeFile(healthFile,JSON.stringify({status:'healthy',lastSuccess:now,lastCheck:now,recordCount:records.length}));
 }catch(error){let previous={lastSuccess:null};try{previous=JSON.parse(await readFile(healthFile,'utf8'));}catch{}const reason=error instanceof Error?error.message:'Unknown error';await writeFile(healthFile,JSON.stringify({...previous,status:'degraded',lastCheck:now,reason}));await writeFile(path.join(data,'alerts',`pmc-accounts-${now.replaceAll(':','-')}.md`),`# Connector degraded: PMC audited accounts\n\n${reason}\n\nNew records have NOT been published. Existing verified records remain available.\n\nLast success: ${previous.lastSuccess}\n`);throw error;}finally{await lock.close();await unlink(path.join(data,'.ingest.lock'));}
}
