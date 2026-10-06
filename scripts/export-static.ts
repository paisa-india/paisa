/**
 * Writes the static data files the website (and anyone else) reads: apps/web/public/data/*.json.
 * Run before `next build` for GitHub Pages; the same files form Paisa's free read-only "static API".
 */
import {mkdir,writeFile,copyFile,readFile} from 'node:fs/promises';
import type {CitiesFile,City} from '../connectors/cityfinance/index';
import {shardOf,DETAIL_SHARDS,CHECKS,type ContractColumns} from '../packages/query/shard';
import path from 'node:path';
import {readDataset,readContracts,readProjects} from '../packages/db/repository';
import {buildSignals,buildStatus} from '../apps/api/service';
import {geographies} from '../packages/schema/index';
const out=path.resolve('apps/web/public/data');await mkdir(out,{recursive:true});
const write=async(name:string,value:unknown)=>{await writeFile(path.join(out,name),JSON.stringify(value));};
const dataset=await readDataset();const contracts=await readContracts();const projects=await readProjects();const signals=await buildSignals();
await copyFile(path.resolve('data/published.json'),path.join(out,'published.json'));
// Cities: a small index for map dots, plus one file per state with full yearly accounts (loaded when a state is opened).
try{
 const cf=JSON.parse(await readFile(path.resolve('data/cities.json'),'utf8')) as CitiesFile;await mkdir(path.join(out,'cities'),{recursive:true});
 const latest=(c:City)=>{const y=Object.keys(c.years).sort().at(-1);return y?{y,ti:c.years[y].ti,te:c.years[y].te}:null;};
 const index=cf.cities.filter(c=>c.lat!==null).map(c=>({id:c.id,n:c.name,s:c.stateId,lat:c.lat,lng:c.lng,p:c.population,t:c.type,ys:Object.keys(c.years).length,l:latest(c)}));
 await write('cities-index.json',{source:cf.source,cities:index});
 // City search: every city's name and state, in columns (loaded only when someone starts typing).
 const named=cf.cities.filter(c=>c.stateId);
 await write('cities-names.json',{id:named.map(c=>c.id),n:named.map(c=>c.name),s:named.map(c=>c.stateId),ys:named.map(c=>Object.keys(c.years).length),p:named.map(c=>c.population??0)});
 // The India view shows only big cities with accounts; each state's full list loads with that state.
 await write('cities-major.json',{cities:index.filter(c=>c.ys>0&&(c.p??0)>=1000000)});
 // Every state gets a file (empty when cityfinance lists no city there), so a missing file always means a failed download.
 const byState=new Map<string,City[]>(geographies.filter(g=>g.parentId==='india').map(g=>[g.id,[]]));for(const c of cf.cities){if(!c.stateId)continue;const l=byState.get(c.stateId)??[];l.push(c);byState.set(c.stateId,l);}
 // Per state: a light list for the map dots, and the yearly accounts in 8 small files loaded when a city is opened.
 for(const [s,list] of byState){
  await write(`cities/${s}.json`,{source:cf.source,cities:list.map(({years,...c})=>({...c,years:{},ys:Object.keys(years).length}))});
  await mkdir(path.join(out,'cities',s),{recursive:true});const parts:Record<string,unknown>[]=Array.from({length:8},()=>({}));
  for(const c of list)if(Object.keys(c.years).length)parts[shardOf(c.id)%8][c.id]=c.years;
  for(let i=0;i<8;i++)await write(`cities/${s}/${i}.json`,parts[i]);
 }
}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
if(contracts){
 await write('contracts.json',contracts);// complete file for data users
 // The site loads a compact list (names stored once) plus contractors; record details load per shard on demand.
 const buyers=[...new Set(contracts.contracts.map(c=>c.buyer))];const bIdx=new Map(buyers.map((b,i)=>[b,i]));const kIdx=new Map(contracts.contractors.map((c,i)=>[c.id,i]));
 // Long ID prefixes are stored once; titles are capped in the list (the full title is in the record details).
 const prefix=contracts.contracts.reduce((p,c)=>{let i=0;while(i<p.length&&p[i]===c.id[i])i++;return p.slice(0,i);},contracts.contracts[0]?.id??'');const cap=(t:string)=>t.length>110?t.slice(0,109).trimEnd()+'…':t;
 const cs=contracts.contracts;const cols:ContractColumns={id:cs.map(c=>c.id.slice(prefix.length)),title:cs.map(c=>cap(c.title)),buyer:cs.map(c=>bIdx.get(c.buyer)!),location:cs.map(c=>c.location),date:cs.map(c=>c.tenderPublished),estimate:cs.map(c=>c.estimatePaise),award:cs.map(c=>c.awardPaise),bidders:cs.map(c=>c.bidders),contractor:cs.map(c=>kIdx.get(c.contractorId)!),check:cs.map(c=>CHECKS.indexOf(c.valueCheck) as 0|1|2)};
 await write('contracts-list.json',{source:contracts.source,excluded:contracts.excluded,prefix,buyers,cols});
 await write('contractors.json',{source:contracts.source,contractors:contracts.contractors});
 await mkdir(path.join(out,'contracts-detail'),{recursive:true});const shards:Record<string,unknown>[]=Array.from({length:DETAIL_SHARDS},()=>({}));
 for(const c of contracts.contracts)shards[shardOf(c.id)][c.id]={ocid:c.ocid,tenderId:c.tenderId,rawAward:c.rawAward,category:c.category,method:c.method,contractorName:c.contractorName,title:c.title};
 for(let i=0;i<DETAIL_SHARDS;i++)await write(`contracts-detail/${i}.json`,shards[i]);
}
if(projects){
 const {validations:_v,...lean}=projects;await write('projects.json',lean);
 // One file per state, so opening a state downloads only its projects. States without projects get an empty file,
 // so "none listed" is a real answer rather than a failed download.
 await mkdir(path.join(out,'projects'),{recursive:true});const states=new Set([...geographies.filter(g=>g.parentId==='india').map(g=>g.id),...projects.projects.flatMap(p=>p.geographyIds)]);
 for(const s of states)await write(`projects/${s}.json`,{...lean,projects:projects.projects.filter(p=>p.geographyIds.includes(s))});
}
if(signals)await write('signals.json',signals);
await write('status.json',await buildStatus());
await write('index.json',{about:'Paisa static data. Read-only, regenerated on every data update. Each file carries its sources; see /sources on the site.',files:{
 'published.json':'National, state (RBI shares) and Pune figures with provenance and validations','projects.json':'MoSPI central projects ₹150 crore+','contracts.json':'Assam contract awards and contractor profiles (ODbL)',
 'signals.json':'Automated signals with rule, inputs and limitations','cities-index.json':'Cities with location and latest totals (cityfinance.in)','cities-names.json':'City names and states, for search','cities/<state>.json':'Each city’s standardised income & expenditure by year','status.json':'Connector health'},generatedAt:new Date().toISOString(),publishedAt:dataset.publishedAt});
console.log('Static data written to',out);
