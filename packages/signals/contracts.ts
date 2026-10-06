import type {Contract,ContractsFile,ProjectsFile} from '../schema/index';
import {evaluate,type Signal} from './index';
import {fiscalYearOf} from '../calculations/index';
/** `set` names the comparison set (department and fiscal year) so the site can list exactly the awards in it. */
export type LiveSignal=Signal&{id:string;subject:{type:'contract'|'contractor'|'project';id:string;label:string;buyer:string};set?:{buyer:string;fy:string}};
/** Real, reproducible signals from published contract awards. Values only from awards that passed the estimate check. */
export function contractSignals(file:ContractsFile):LiveSignal[]{
 const base={source:`${file.source.title} · ${file.source.datasetVersion}`,generatedAt:file.publishedAt,comparable:true};
 const out:LiveSignal[]=[];
 for(const c of file.contracts){
  if(c.bidders===null)continue;
  const s=evaluate({...base,period:`Tender published ${c.tenderPublished??'(date not published)'}`,kind:'low-bids',bidCount:c.bidders,qualifiedBidCount:null});
  if(s)out.push({...s,id:`low-bids:${c.id}`,subject:{type:'contract',id:c.id,label:c.title,buyer:c.buyer}});
 }
 // Concentration is measured within one department and one fiscal year (by tender date), so a supplier's share is compared
 // with awards made in the same year. Awards without a tender date can't be placed in a year and are left out.
 const sets=new Map<string,{buyer:string;fy:string;list:Contract[]}>();
 for(const c of file.contracts){const fy=fiscalYearOf(c.tenderPublished);if(c.valueCheck!=='plausible'||!fy)continue;const k=`${c.buyer}\u0000${fy}`;const set=sets.get(k)??{buyer:c.buyer,fy,list:[]};set.list.push(c);sets.set(k,set);}
 for(const {buyer,fy,list} of sets.values()){
  const total=list.reduce((a,c)=>a+BigInt(c.awardPaise),0n);const per=new Map<string,{name:string;paise:bigint}>();
  for(const c of list){const p=per.get(c.contractorId)??{name:c.contractorName,paise:0n};p.paise+=BigInt(c.awardPaise);per.set(c.contractorId,p);}
  for(const [id,p] of per){
   const s=evaluate({...base,period:`Fiscal year ${fy} (by tender date)`,kind:'concentration',supplierRupees:(p.paise/100n).toString(),totalRupees:(total/100n).toString(),contractCount:list.length,comparisonSet:`${buyer} · FY ${fy} · checked awards`});
   if(s)out.push({...s,id:`concentration:${buyer}:${fy}:${id}`,subject:{type:'contractor',id,label:p.name,buyer},set:{buyer,fy}});
  }
 }
 return out;
}
/** Cost-change and money-ahead-of-work signals from MoSPI's project rows (both values from the same monthly report). */
export function projectSignals(file:ProjectsFile):LiveSignal[]{
 const base={source:`${file.source.title} · ${file.source.datasetVersion}`,period:`As of ${file.reportMonth}`,generatedAt:file.publishedAt,comparable:true};const out:LiveSignal[]=[];
 for(const p of file.projects){
  const subject={type:'project' as const,id:p.id,label:p.name,buyer:`${p.ministry} · ${p.stateLabel}`};
  const cost=evaluate({...base,kind:'cost-change',originalRupees:p.originalRupees,currentRupees:p.latestRupees,originalType:'SANCTIONED',currentType:'SANCTIONED'});
  if(cost)out.push({...cost,id:`cost-change:${p.id}`,subject});
  if(p.expenditureRupees&&p.physicalProgress&&BigInt(p.latestRupees)>0n){
   const financial=Number(BigInt(p.expenditureRupees)*10000n/BigInt(p.latestRupees))/100,physical=Number(p.physicalProgress);
   const gap=evaluate({...base,kind:'progress-gap',financialPct:financial,physicalPct:physical});if(gap)out.push({...gap,id:`progress-gap:${p.id}`,subject});
  }
 }
 return out;
}
