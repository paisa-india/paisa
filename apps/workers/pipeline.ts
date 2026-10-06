import {readFile,writeFile,mkdir,rename,open,unlink} from 'node:fs/promises';
import path from 'node:path';
import {sha256,saveImmutable} from '../../packages/provenance/index';
import {parseCga} from '../../connectors/cga/index';
import {parsePdf,parserVersion} from '../../connectors/union-budget/index';
import {validateBudget} from '../../packages/validation/index';
import {parsePmcPdf,validatePmc,PMC_ARTIFACT} from '../../connectors/pmc-accounts/index';
import {RBI_ARTIFACTS,parseStatement,validateShares} from '../../connectors/rbi-state-finances/index';
import {summarise} from '../../connectors/assam-contracts/index';
import {summariseProjects} from '../../connectors/mospi-projects/index';
import type {ContractsFile,ProjectsFile} from '../../packages/schema/index';
import type {CitiesFile} from '../../connectors/cityfinance/index';
import type {Dataset,Source} from '../../packages/schema/index';
export async function ingest(root:string,online=false){
 const data=path.join(root,'data');await mkdir(path.join(data,'runs'),{recursive:true});await mkdir(path.join(data,'alerts'),{recursive:true});
 const lock=await open(path.join(data,'.ingest.lock'),'wx');
 const now=new Date().toISOString();const runId=now.replaceAll(':','-');const transitions=['RAW'];
 try{
  const sources:Source[]=[];const records=[];
  for(const id of ['bag1','bag5','bag6','bag7']){
   let source:Source=JSON.parse(await readFile(path.join(data,'snapshots',`${id}.json`),'utf8'));
   let raw=new Uint8Array(await readFile(path.join(root,source.path)));
   if(sha256(raw)!==source.sha256)throw new Error('Snapshot integrity mismatch');
   if(online){
    const headers:Record<string,string>={'User-Agent':'Paisa/0.1 public-budget-collector'};
    const etag=source.httpMetadata.etag??source.httpMetadata.ETag;
    const modified=source.httpMetadata['last-modified']??source.httpMetadata['Last-Modified'];
    if(etag)headers['If-None-Match']=etag;if(modified)headers['If-Modified-Since']=modified;
    let response:Response|undefined;
    for(let attempt=0;attempt<3;attempt++){
     try{response=await fetch(source.url,{headers,signal:AbortSignal.timeout(30000),redirect:'error'});if(response.status!==429&&response.status<500)break;}catch(error){if(attempt===2)throw error;}
     await new Promise(resolve=>setTimeout(resolve,1000*2**attempt));
    }
    if(!response)throw new Error('Source unavailable');
    if(response.status!==304){
     if(!response.ok)throw new Error(`HTTP ${response.status}`);
     if(!response.headers.get('content-type')?.includes('pdf'))throw new Error('Unexpected source content type');
     if(Number(response.headers.get('content-length')??0)>20000000)throw new Error('Source too large');
     raw=new Uint8Array(await response.arrayBuffer());if(raw.length>20000000)throw new Error('Source too large');
     const saved=await saveImmutable(path.join(data,'snapshots'),raw);
     source={...source,sha256:saved.hash,path:`data/snapshots/${saved.hash}.pdf`,retrievedAt:now,httpMetadata:Object.fromEntries(response.headers),parserVersion};
    }
    await new Promise(resolve=>setTimeout(resolve,1500));
   }
   sources.push(source);records.push(...await parsePdf(raw,source));
  }
  transitions.push('PARSED');const validations=validateBudget(records);transitions.push('VALIDATED');
  const cgaSource:Source=JSON.parse(await readFile(path.join(data,'snapshots/cga.json'),'utf8'));
  const cgaRaw=await readFile(path.join(root,cgaSource.path));if(sha256(cgaRaw)!==cgaSource.sha256)throw new Error('CGA snapshot integrity mismatch');
  records.push(...parseCga(cgaRaw,cgaSource));sources.push(cgaSource);
  const pmcSource:Source=JSON.parse(await readFile(path.join(data,'snapshots',`${PMC_ARTIFACT.id}.json`),'utf8'));
  const pmcRaw=new Uint8Array(await readFile(path.join(root,pmcSource.path)));if(sha256(pmcRaw)!==pmcSource.sha256)throw new Error('PMC snapshot integrity mismatch');
  const pmc=await parsePmcPdf(pmcRaw,pmcSource);validations.push(...validatePmc(pmc,PMC_ARTIFACT.fiscalYear));records.push(...pmc);sources.push(pmcSource);
  const shares=[];
  for(const a of RBI_ARTIFACTS){const src:Source=JSON.parse(await readFile(path.join(data,'snapshots',`${a.id}.json`),'utf8'));const raw=new Uint8Array(await readFile(path.join(root,src.path)));if(sha256(raw)!==src.sha256)throw new Error('RBI snapshot integrity mismatch');shares.push(...parseStatement(raw,src,a.statement));sources.push(src);}
  validations.push(...validateShares(shares));
  // Contract awards are parsed by their own collector into data/contracts.json; here we only verify and summarise them.
  let contractsSummary:Dataset['contractsSummary'];
  try{const cf:ContractsFile=JSON.parse(await readFile(path.join(data,'contracts.json'),'utf8'));const snap=new Uint8Array(await readFile(path.join(root,cf.source.path)));if(sha256(snap)!==cf.source.sha256)throw new Error('Contracts snapshot integrity mismatch');sources.push(cf.source);validations.push(...cf.validations);contractsSummary=summarise(cf);}
  catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  let citiesSummary:Dataset['citiesSummary'];
  try{const cf:CitiesFile=JSON.parse(await readFile(path.join(data,'cities.json'),'utf8'));const snap=new Uint8Array(await readFile(path.join(root,cf.source.path)));if(sha256(snap)!==cf.source.sha256)throw new Error('Cities snapshot integrity mismatch');sources.push(cf.source);validations.push(...cf.validations);
   const byState:Record<string,number>={};const yrs=new Set<string>();let cityYears=0;for(const c of cf.cities){const n=Object.keys(c.years).length;if(!n)continue;cityYears+=n;Object.keys(c.years).forEach(y=>yrs.add(y));if(c.stateId)byState[c.stateId]=(byState[c.stateId]??0)+1;}
   citiesSummary={sourceId:cf.source.id,cities:cf.cities.length,withData:cf.cities.filter(c=>Object.keys(c.years).length).length,cityYears,years:[...yrs].sort(),byState};}
  catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  let projectsSummary:Dataset['projectsSummary'];
  try{const pf:ProjectsFile=JSON.parse(await readFile(path.join(data,'projects.json'),'utf8'));const snap=new Uint8Array(await readFile(path.join(root,pf.source.path)));if(sha256(snap)!==pf.source.sha256)throw new Error('Projects snapshot integrity mismatch');sources.push(pf.source);validations.push(...pf.validations);projectsSummary=summariseProjects(pf);}
  catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  const dataset:Dataset={status:'PUBLISHED',publishedAt:now,records,shares,...(contractsSummary?{contractsSummary}:{}),...(projectsSummary?{projectsSummary}:{}),...(citiesSummary?{citiesSummary}:{}),sources,validations};
  const temp=path.join(data,`published-${runId}.tmp`);await writeFile(temp,JSON.stringify(dataset,null,2));
  await rename(temp,path.join(data,'published.json'));transitions.push('PUBLISHED');
  for(const source of sources)await writeFile(path.join(data,'snapshots',`${source.id}.json`),JSON.stringify(source,null,2));
  const health={connector:'union-budget',status:'healthy',lastSuccess:now,lastCheck:now,recordCount:records.length,reason:null};
  await writeFile(path.join(data,'health.json'),JSON.stringify(health,null,2));await writeFile(path.join(data,'runs',`${runId}.json`),JSON.stringify({transitions,health,validations},null,2));return dataset;
 }catch(error){
  let previous={lastSuccess:null};try{previous=JSON.parse(await readFile(path.join(data,'health.json'),'utf8'));}catch{}
  const health={...previous,connector:'union-budget',status:'degraded',lastCheck:now,reason:error instanceof Error?error.message:'Unknown ingestion failure'};
  await writeFile(path.join(data,'health.json'),JSON.stringify(health,null,2));await writeFile(path.join(data,'runs',`${runId}.json`),JSON.stringify({transitions:[...transitions,'REJECTED'],health}));
  await writeFile(path.join(data,'alerts',`${runId}.md`),`# Connector degraded: Union Budget\n\n${health.reason}\n\nNew records have NOT been published. Existing verified records remain available.\n\nLast success: ${previous.lastSuccess}\n`);
  throw error;
 }finally{await lock.close();await unlink(path.join(data,'.ingest.lock'));}
}
