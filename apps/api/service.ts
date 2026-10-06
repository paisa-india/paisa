import {readDataset,readHealth,readContracts,readProjects,dataDirectory} from '../../packages/db/repository';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {contractSignals,projectSignals} from '../../packages/signals/contracts';
import type {LiveSignal} from '../../packages/signals/contracts';
import {queryProjects,queryContracts,queryContractors,contractorProfile,PROJECTS_COVERAGE} from '../../packages/query/browse';
import {geographies,NO_DATA} from '../../packages/schema/index';
import {localProvider,executeQuery} from './query';
export async function api(path:string,params:URLSearchParams){
 const d=await readDataset();
 const collection=(group:string)=>d.records.filter(r=>r.group===group&&r.fiscalYear===(params.get('fy')??'2026-27')&&r.valueType===(params.get('type')??'BE')&&(!params.get('q')||r.label.toLowerCase().includes(params.get('q')!.toLowerCase())));
 if(path==='india/overview')return {status:'PUBLISHED',publishedAt:d.publishedAt,records:collection('overview'),actualToDate:d.records.filter(r=>r.sourceId==='cga'),coverage:'Union Budget estimates, FY 2024-25 annual actuals and CGA provisional cumulative monthly accounts.'};
 if(path==='revenue'||path==='expenditure')return {records:collection(path)};
 if(path==='municipal'){const geography=params.get('geography')??'pmc';const records=d.records.filter(r=>r.geographyId===geography&&(!params.get('fy')||r.fiscalYear===params.get('fy')));return records.length?{geography,records,coverage:'Audited annual accounts (accrual basis), schedule totals. Ward, project and contract levels are not connected.'}:{geography,records:[],coverage:'not-connected',message:NO_DATA};}
 if(path==='states'){const fy=params.get('fy');const rows=(d.shares??[]).filter(r=>(!fy||r.fiscalYear===fy)&&(!params.get('state')||r.geographyId===params.get('state')));return {unit:'tenths of a per cent of GSDP',records:rows,coverage:'RBI State Finances 2025-26, Statements 33-34: shares only; rupee amounts not connected.'};}
 if(path==='schemes')return {records:collection('scheme')};
 if(path==='geographies')return {geographies:geographies.filter(g=>!params.has('parent')||g.parentId===params.get('parent'))};
 if(path==='projects'||path.startsWith('projects/')){
  const f=await readProjects();if(!f)return {records:[],coverage:'not-connected',message:NO_DATA};
  if(path.startsWith('projects/')){const p=f.projects.find(x=>x.id===decodeURIComponent(path.slice(9)));return p?{coverage:PROJECTS_COVERAGE(f.reportMonth),source:f.source,reportMonth:f.reportMonth,project:p}:null;}
  return queryProjects(f,params);
 }
 if(path==='signals'){const s=await buildSignals();return s?{...s,records:s.records.filter(x=>!params.get('rule')||x.rule===params.get('rule'))}:{records:[],coverage:'not-connected',message:NO_DATA};}
 if(path==='contracts'||path==='contractors'||path.startsWith('contractors/')){
  const f=await readContracts();if(!f)return {records:[],coverage:'not-connected',message:NO_DATA};
  if(path.startsWith('contractors/'))return contractorProfile(f,decodeURIComponent(path.slice(12)));
  return path==='contractors'?queryContractors(f,params):queryContracts(f,params);
 }
 if(['projects','tenders','ministries'].includes(path))return {records:[],coverage:'not-connected',message:NO_DATA};
 if(path==='sources')return {sources:d.sources};
 if(path.startsWith('sources/'))return d.sources.find(s=>s.id===path.split('/')[1])??null;
 if(path.startsWith('provenance/')){const id=decodeURIComponent(path.split('/').slice(2).join('/'));const r=d.records.find(r=>r.id===id);return r?{record:r,source:d.sources.find(s=>s.id===r.sourceId),validations:d.validations}:null;}
 if(path==='status')return buildStatus();
 if(path==='ask'){const question=params.get('q')??'';if(question.length>500)throw new Error('Question too long');return executeQuery(await localProvider.interpret(question),d);}
 return null;
}
/** All live signals with counts per rule. Also written to a static file for the static site. */
export async function buildSignals():Promise<{coverage:string;sources:unknown[];records:LiveSignal[];counts:Record<string,number>}|null>{
 const [cf,pf]=[await readContracts(),await readProjects()];if(!cf&&!pf)return null;
 const all=[...(pf?projectSignals(pf):[]),...(cf?contractSignals(cf):[])];const counts:Record<string,number>={};for(const x of all)counts[x.rule]=(counts[x.rule]??0)+1;
 return {coverage:'Live signals from MoSPI central projects and Assam contract awards.',sources:[pf?.source,cf?.source].filter(Boolean),records:all,counts};
}

export type ConnectorStatus={id:string;name:string;nameHi:string;state:'ok'|'behind'|'failing'|'not-connected';mode:'daily'|'monthly'|'manual-annual'|'not-connected';
 period:string|null;lastVerified:string|null;note:string|null};
/**
 * Freshness per source, kept separate on purpose: the period the published data covers, when that data was downloaded and
 * passed every check ("last verified"), and how it updates. Old-but-valid data is shown as such, never as "live".
 * The daily run's own result (including checks that found nothing new) is public on GitHub Actions.
 */
export async function buildStatus(now=new Date()):Promise<{generatedAt:string;connectors:ConnectorStatus[]}>{
 const d=await readDataset();const [pf,cf]=[await readProjects(),await readContracts()];
 const span=(ids:string[])=>{const ys=[...new Set(d.records.filter(r=>ids.includes(r.sourceId)).map(r=>r.fiscalYear))].sort();return ys.length?(ys.length>1?`${ys[0]} to ${ys.at(-1)}`:ys[0]):null;};
 const health=async(id:string)=>await readHealth(id) as {status?:string;lastSuccess?:string|null;reason?:string|null};
 const daily=async(id:string,name:string,nameHi:string,period:string|null):Promise<ConnectorStatus>=>{const h=await health(id);
  return {id,name,nameHi,state:!h.lastSuccess?'not-connected':h.status==='healthy'?'ok':'failing',mode:'daily',period,lastVerified:h.lastSuccess??null,note:h.status!=='healthy'&&h.reason?h.reason:null};};
 let cities:{source:{retrievedAt:string};cities:{years:Record<string,unknown>}[]}|null=null;
 try{cities=JSON.parse(await readFile(path.join(dataDirectory(),'cities.json'),'utf8'));}catch{cities=null;}
 const cityYears=cities?[...new Set(cities.cities.flatMap(c=>Object.keys(c.years)))].sort():[];
 const monthsBehind=(ym:string)=>{const [y,m]=ym.split('-').map(Number);return (now.getUTCFullYear()-y)*12+(now.getUTCMonth()+1-m);};
 const rbi=d.sources.find(s=>s.id.startsWith('rbi-sf-'));const shareYears=[...new Set((d.shares??[]).map(r=>r.fiscalYear))].sort();
 const missing=(id:string,name:string,nameHi:string):ConnectorStatus=>({id,name,nameHi,state:'not-connected',mode:'not-connected',period:null,lastVerified:null,note:null});
 const connectors:ConnectorStatus[]=[
  await daily('union-budget','Union Budget','केंद्रीय बजट',span(['bag1','bag5','bag6','bag7'])),
  await daily('cga','Monthly accounts (CGA)','मासिक खाते (CGA)',d.records.find(r=>r.sourceId==='cga')?.period??null),
  await daily('pmc-accounts','Pune Municipal Corporation accounts','पुणे महानगरपालिका खाते',span(d.sources.filter(s=>s.id.startsWith('pmc-')).map(s=>s.id))),
  rbi?{id:'rbi-state-finances',name:'State finances (RBI)',nameHi:'राज्य वित्त (RBI)',state:'ok',mode:'manual-annual',period:shareYears.length?`${shareYears[0]} to ${shareYears.at(-1)}`:null,lastVerified:rbi.retrievedAt,note:'RBI blocks scripted downloads; a person adds the new edition each year.'}:missing('rbi-state-finances','State finances (RBI)','राज्य वित्त (RBI)'),
  cities?{id:'cityfinance',name:'City accounts (cityfinance.in)',nameHi:'शहरों के खाते (cityfinance.in)',state:'ok',mode:'monthly',period:cityYears.length?`${cityYears[0]} to ${cityYears.at(-1)}`:null,lastVerified:cities.source.retrievedAt,note:null}:missing('cityfinance','City accounts (cityfinance.in)','शहरों के खाते (cityfinance.in)'),
  pf?{id:'mospi-projects',name:'Central projects (MoSPI)',nameHi:'केंद्रीय परियोजनाएं (MoSPI)',state:monthsBehind(pf.reportMonth)>3?'behind':'ok',mode:'daily',period:`Report for ${pf.reportMonth}`,lastVerified:pf.source.retrievedAt,
   note:monthsBehind(pf.reportMonth)>3?'No newer report has been found yet; the latest one available is shown.':null}:missing('mospi-projects','Central projects (MoSPI)','केंद्रीय परियोजनाएं (MoSPI)'),
  cf?{id:'assam-contracts',name:'Assam contract awards',nameHi:'असम अनुबंध',state:'ok',mode:'daily',period:(()=>{const ys=[...new Set(cf.contracts.map(c=>c.tenderPublished?.slice(0,4)).filter(Boolean))].sort();return ys.length?`Tenders ${ys[0]}–${ys.at(-1)}`:null;})(),lastVerified:cf.source.retrievedAt,
   note:'A fixed published dataset, checked daily for a new version.'}:missing('assam-contracts','Assam contract awards','असम अनुबंध'),
  missing('cbdt','Direct tax collections (CBDT)','प्रत्यक्ष कर संग्रह (CBDT)'),missing('mca','Company register (MCA)','कंपनी रजिस्टर (MCA)'),
  missing('cppp','Central tenders (CPPP)','केंद्रीय निविदाएं (CPPP)'),missing('cag','Audit findings (CAG)','लेखापरीक्षा निष्कर्ष (CAG)')];
 return {generatedAt:now.toISOString(),connectors};
}
