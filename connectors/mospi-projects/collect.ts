import {readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {saveImmutable,sha256} from '../../packages/provenance/index';
import {KNOWN_REPORTS,MOSPI_SOURCE_ID,parseReport,parserVersion} from './index';
import type {ProjectsFile,Source} from '../../packages/schema/index';
const UA='Paisa/0.1 public-project-monitor';
const MONTH_NAMES=['January','February','March','April','May','June','July','August','September','October','November','December'];
/** Candidate URLs for a month: the reviewed list first, then MoSPI's predictable PAIMANA path (reachable from some networks only). */
function candidates(month:string){const [y,m]=month.split('-').map(Number);return [...KNOWN_REPORTS.filter(r=>r.month===month).map(r=>r.url),`https://ipm.mospi.gov.in/Content/PDF/FlashReport_${MONTH_NAMES[m-1]}_${y}.pdf`];}
const nextMonth=(month:string)=>{const [y,m]=month.split('-').map(Number);return m===12?`${y+1}-01`:`${y}-${String(m+1).padStart(2,'0')}`;};
async function tryFetch(url:string){try{const r=await fetch(url,{headers:{'User-Agent':UA},redirect:'follow',signal:AbortSignal.timeout(120000)});if(!r.ok||!r.headers.get('content-type')?.includes('pdf'))return null;const raw=new Uint8Array(await r.arrayBuffer());return raw.length>1000&&raw.length<60000000?{raw,headers:Object.fromEntries(r.headers)}:null;}catch{return null;}}
/** Imports the newest available Flash Report. Returns {changed:false, reason} when no newer report could be reached. */
export async function collectProjects(root:string,online=true){
 const data=path.join(root,'data'),manifest=path.join(data,'snapshots',`${MOSPI_SOURCE_ID}.json`);
 let current:Source|null=null;try{current=JSON.parse(await readFile(manifest,'utf8'));}catch{}
 let found:{raw:Uint8Array;url:string;headers:Record<string,string>}|null=null;
 if(online){
  const have=current?.datasetVersion.match(/\d{4}-\d{2}/)?.[0]??'2026-03';const now=new Date();const limit=`${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}`;
  for(let m=nextMonth(have);m<=limit;m=nextMonth(m))for(const url of candidates(m)){const got=await tryFetch(url);if(got){found={...got,url};break;}}
  if(!found&&!current){for(const r of KNOWN_REPORTS){const got=await tryFetch(r.url);if(got){found={...got,url:r.url};break;}}}
  if(!found)return {changed:false,reason:`No report newer than ${have} was reachable. Check https://paimana-proj.mospi.gov.in and PIB, then add the PDF link to KNOWN_REPORTS.`};
 }
 let source=current;let raw:Uint8Array;
 if(found){const saved=await saveImmutable(path.join(data,'snapshots'),found.raw,'pdf');raw=found.raw;
  source={id:MOSPI_SOURCE_ID,url:found.url,sha256:saved.hash,path:`data/snapshots/${saved.hash}.pdf`,retrievedAt:new Date().toISOString(),httpMetadata:found.headers,datasetVersion:'pending',parserVersion,
   authority:'Ministry of Statistics and Programme Implementation (IPMD, PAIMANA)',title:'MoSPI Flash Report · central projects ₹150 crore+',retrieval:'Automatic: reviewed link list plus MoSPI monthly URL',
   license:{name:'Source-specific terms; review pending',url:'https://paimana-proj.mospi.gov.in/QuickLink/HyperLinkPolicy',redistributionAllowed:false,attribution:'Ministry of Statistics and Programme Implementation, Government of India: Flash Report on Central Sector Infrastructure Projects (PAIMANA). PAISA is independent and not endorsed by any government.'}};}
 else{if(!source)throw new Error('No MoSPI snapshot; run online first');raw=new Uint8Array(await readFile(path.join(root,source.path)));if(sha256(raw)!==source.sha256)throw new Error('MoSPI snapshot integrity mismatch');}
 const parsed=await parseReport(raw,source!);source={...source!,datasetVersion:`Flash Report ${parsed.reportMonth}`};
 const file:ProjectsFile={status:'PUBLISHED',publishedAt:new Date().toISOString(),...parsed,source};
 const temp=path.join(data,'projects.tmp');await writeFile(temp,JSON.stringify(file));await rename(temp,path.join(data,'projects.json'));
 await writeFile(manifest,JSON.stringify(source,null,2));
 return {changed:true,file};
}
