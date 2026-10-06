import {readDataset,readHealth,readContracts,readProjects} from '../../packages/db/repository';
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
 if(path==='status')return {connectors:[{id:'union-budget',...await readHealth()},{id:'cga',...await readHealth('cga')},{id:'pmc-accounts',...await readHealth('pmc-accounts')},{id:'mospi-projects',...(await readProjects()?{status:'healthy',lastSuccess:(await readProjects())!.source.retrievedAt}:{status:'not-connected',lastSuccess:null})},{id:'assam-contracts',...(await readContracts()?{status:'healthy',lastSuccess:(await readContracts())!.source.retrievedAt}:{status:'not-connected',lastSuccess:null})},{id:'rbi-state-finances',status:d.shares?.length?'healthy':'not-connected',lastSuccess:d.sources.find(s=>s.id==='rbi-sf-2025-26-st33')?.retrievedAt??null,mode:'manual annual download'},...['cbdt','city-finance','data-gov-in','cppp','cag'].map(id=>({id,status:'not-connected',lastSuccess:null}))]};
 if(path==='ask'){const question=params.get('q')??'';if(question.length>500)throw new Error('Question too long');return executeQuery(await localProvider.interpret(question),d);}
 return null;
}
/** All live signals with counts per rule. Also written to a static file for the static site. */
export async function buildSignals():Promise<{coverage:string;sources:unknown[];records:LiveSignal[];counts:Record<string,number>}|null>{
 const [cf,pf]=[await readContracts(),await readProjects()];if(!cf&&!pf)return null;
 const all=[...(pf?projectSignals(pf):[]),...(cf?contractSignals(cf):[])];const counts:Record<string,number>={};for(const x of all)counts[x.rule]=(counts[x.rule]??0)+1;
 return {coverage:'Live signals from MoSPI central projects and Assam contract awards.',sources:[pf?.source,cf?.source].filter(Boolean),records:all,counts};
}
