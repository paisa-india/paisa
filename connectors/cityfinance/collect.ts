import {readFile,writeFile,mkdir,rename,readdir} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import path from 'node:path';
import {saveImmutable,sha256} from '../../packages/provenance/index';
import {API,YEARS,CITYFINANCE_SOURCE_ID,parseStatement,cityFromListing,parserVersion,type CitiesFile,type UlbListing} from './index';
import type {Source} from '../../packages/schema/index';
const UA='Paisa/0.1 public-finance-collector (open-source civic project)';
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function getJson(url:string){
 for(let attempt=0;attempt<4;attempt++){
  try{const r=await fetch(url,{headers:{'User-Agent':UA,Accept:'application/json'},signal:AbortSignal.timeout(60000)});if(r.status===429||r.status>=500)throw new Error(`HTTP ${r.status}`);if(!r.ok)throw new Error(`HTTP ${r.status} (not retried)`);return await r.json();}
  catch(e){if(String(e).includes('not retried')||attempt===3)throw e;await sleep(2000*2**attempt);}
 }
}
/**
 * Downloads every city's standardised income & expenditure statement (one request per city, one per second),
 * caching responses so an interrupted run resumes. Then stores one immutable gzipped snapshot and publishes data/cities.json.
 */
export async function collectCities(root:string,{online=true,limit=Infinity,log=console.log,cacheOnly=false}:{online?:boolean;limit?:number;log?:(m:string)=>void;cacheOnly?:boolean}={}){
 const data=path.join(root,'data'),cache=path.join(data,'.cache','cityfinance'),manifest=path.join(data,'snapshots',`${CITYFINANCE_SOURCE_ID}.json`);
 let source:Source;let lines:{listing:UlbListing;response:unknown}[];
 if(online){
  await mkdir(cache,{recursive:true});
  const list=await getJson(`${API}/ulbs`) as {data:Record<string,{ulbs:UlbListing[]}>};
  const ulbs=Object.values(list.data).flatMap(g=>g.ulbs).filter(u=>/^[0-9a-f]{24}$/.test(u._id)).slice(0,limit);
  if(ulbs.length<(limit===Infinity?3000:Math.min(limit,1)))throw new Error(`cityfinance: only ${ulbs.length} cities listed`);
  const done=new Set((await readdir(cache)).map(f=>f.replace(/\.json$/,'')));let n=0;
  for(const u of ulbs){
   if(done.has(u._id)||cacheOnly)continue;
   const q=new URLSearchParams([['btnKey','incomeStatement'],['selectedUlb',u._id],['ulbIds',u._id],...YEARS.map(y=>['years',y])]);
   const res=await getJson(`${API}/dashboard/city/bs-is?${q}`);await writeFile(path.join(cache,`${u._id}.json`),JSON.stringify(res));
   if(++n%100===0)log(`cityfinance: ${done.size+n}/${ulbs.length} cities downloaded`);
   await sleep(1000);
  }
  const cached=new Set((await readdir(cache)).map(f=>f.replace(/\.json$/,'')));
  lines=[];for(const u of ulbs)if(!cacheOnly||cached.has(u._id))lines.push({listing:u,response:JSON.parse(await readFile(path.join(cache,`${u._id}.json`),'utf8'))});
  const raw=gzipSync(Buffer.from(lines.map(l=>JSON.stringify(l)).join('\n')),{level:9});
  const saved=await saveImmutable(path.join(data,'snapshots'),new Uint8Array(raw),'jsonl.gz');
  source={id:CITYFINANCE_SOURCE_ID,url:'https://www.cityfinance.in/municipal-data/national',sha256:saved.hash,path:`data/snapshots/${saved.hash}.jsonl.gz`,retrievedAt:new Date().toISOString(),httpMetadata:{endpoint:`${API}/dashboard/city/bs-is (one request per city)`,lastUpdated:(await citiesLastUpdated())??'unknown'},
   datasetVersion:`cityfinance.in standardised annual accounts, FY ${YEARS[0]} to ${YEARS.at(-1)}`,parserVersion,authority:'Ministry of Housing and Urban Affairs (cityfinance.in, managed by Janaagraha)',title:'cityfinance.in · city income & expenditure',
   retrieval:'Automatic: the public data API behind cityfinance.in city dashboards (no login), one request per city per second.',
   license:{name:'Source-specific terms; permission requested',url:'https://www.cityfinance.in/',redistributionAllowed:false,attribution:'Municipal finance data: cityfinance.in, Ministry of Housing and Urban Affairs, Government of India (standardised from cities’ annual accounts). PAISA is independent and not endorsed by any government.'}};
 }else{
  source=JSON.parse(await readFile(manifest,'utf8'));const raw=new Uint8Array(await readFile(path.join(root,source.path)));if(sha256(raw)!==source.sha256)throw new Error('cityfinance snapshot integrity mismatch');
  lines=gunzipSync(raw).toString('utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
 }
 const file=parseCities(lines,source);
 const temp=path.join(data,'cities.tmp');await writeFile(temp,JSON.stringify(file));await rename(temp,path.join(data,'cities.json'));
 await writeFile(manifest,JSON.stringify(source,null,2));
 return file;
}
export function parseCities(lines:{listing:UlbListing;response:unknown}[],source:Source):CitiesFile{
 const excluded=new Map<string,number>();const bump=(r:string,n=1)=>excluded.set(r,(excluded.get(r)??0)+n);let checked=0;
 // cityfinance's list includes placeholder test entries; they are not cities.
 const real=lines.filter(({listing})=>!/\btest\b/i.test(listing.state)&&!/\btest\b/i.test(listing.name));if(real.length<lines.length)bump('test/placeholder entries in the city list',lines.length-real.length);
 const cities=real.map(({listing,response})=>{
  const rows=(response as {success?:boolean;data?:Record<string,unknown>[]}).data;if(!Array.isArray(rows)){bump('city statement unavailable');return cityFromListing(listing,{});}
  const {years,rejected}=parseStatement(listing._id,rows);checked+=Object.keys(years).length+rejected.length;if(rejected.length)bump('city-year where items do not add up to the published total',rejected.length);
  return cityFromListing(listing,years);
 });
 const withData=cities.filter(c=>Object.keys(c.years).length>0).length;
 const validations=[{rule:`cityfinance: ${checked} city-years checked; income and expenditure items add up exactly to published totals in every published city-year`,passed:true,differenceRupees:'0',toleranceRupees:'0'},
  {rule:`cityfinance: ${withData} of ${cities.length} cities have at least one year of accounts`,passed:withData>0,differenceRupees:'0',toleranceRupees:'0'}];
 if(!withData)throw new Error('cityfinance: no city has usable accounts');
 return {status:'PUBLISHED',publishedAt:new Date().toISOString(),source,parserVersion,cities,excluded:[...excluded.entries()].map(([reason,count])=>({reason,count})),validations};
}
/** Cheap freshness check: cityfinance publishes a "last updated" date. Returns it, or null if unreachable. */
export async function citiesLastUpdated(){try{const r=await getJson(`${API}/ledger/lastUpdated?ulb=&state=`) as {data?:string;year?:string};return r?.data?`${r.data} (${r.year??''})`:null;}catch{return null;}}
