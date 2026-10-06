'use client';
import type {ContractsFile,ProjectsFile} from '../../../packages/schema/index';
import type {LiveSignal} from '../../../packages/signals/contracts';
import {queryContracts,queryContractors,contractorProfile,queryProjects} from '../../../packages/query/browse';
import {loadJson} from './static-data';
import {CHECKS,type ContractColumns} from '../../../packages/query/shard';
import type {Contractor,Contract,Source} from '../../../packages/schema/index';
type ContractList={source:Source;excluded:ContractsFile['excluded'];prefix:string;buyers:string[];cols:ContractColumns};
let contractsFile:Promise<ContractsFile>|null=null;
/** Rebuilds contract records from the compact list. Record-level details (OCID, raw value…) are fetched per shard when opened. */
function loadContracts(){return contractsFile??=Promise.all([loadJson<ContractList>('contracts-list.json'),loadJson<{contractors:Contractor[]}>('contractors.json')]).then(([l,k])=>({status:'PUBLISHED',publishedAt:'',source:l.source,snapshotHash:l.source.sha256,parserVersion:l.source.parserVersion,excluded:l.excluded,validations:[],contractors:k.contractors,
 contracts:l.cols.id.map((sid,i):Contract=>{const k_=k.contractors[l.cols.contractor[i]];return {id:l.prefix+sid,ocid:'',tenderId:'',title:l.cols.title[i],buyer:l.buyers[l.cols.buyer[i]],location:l.cols.location[i],category:null,method:null,tenderPublished:l.cols.date[i],estimatePaise:l.cols.estimate[i],awardPaise:l.cols.award[i],rawAward:'',bidders:l.cols.bidders[i],contractorId:k_.id,contractorName:k_.name,valueCheck:CHECKS[l.cols.check[i]],geographyId:'assam',sourceId:l.source.id};})}) as ContractsFile);}
type Signals={coverage:string;sources:unknown[];records:LiveSignal[];counts:Record<string,number>};
/** Answers the site's /api/v1 requests in the browser from static files, using the same query code as the API server. */
export async function staticApi<T=unknown>(url:string):Promise<T>{
 const u=new URL(url,'https://paisa.local');const path=u.pathname.replace(/^\/api\/v1\//,'');const p=u.searchParams;
 let result:unknown=null;
 if(path==='contracts')result=queryContracts(await loadContracts(),p);
 else if(path==='contractors')result=queryContractors(await loadContracts(),p);
 else if(path.startsWith('contractors/'))result=contractorProfile(await loadContracts(),decodeURIComponent(path.slice(12)));
 else if(path==='projects'){const s=p.get('state');result=queryProjects(await loadJson<ProjectsFile>(s?`projects/${s}.json`:'projects.json'),p);}
 else if(path==='signals'){const s=await loadJson<Signals>('signals.json');result={...s,records:s.records.filter(x=>!p.get('rule')||x.rule===p.get('rule'))};}
 else if(path==='status')result=await loadJson('status.json');
 if(result===null)throw new Error(`Not found: ${path}`);
 return result as T;
}
