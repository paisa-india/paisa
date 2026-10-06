/**
 * Pure search, filter and paging over published files. Shared by the optional API server and the static site
 * (which runs these in the browser on pre-generated JSON), so both always return identical results.
 */
import {fiscalYearOf} from '../calculations/index';
import type {Contract,ContractsFile,Project,ProjectsFile} from '../schema/index';
export type Params={get(name:string):string|null};
export const PROJECTS_COVERAGE=(month:string)=>`Central-sector infrastructure projects of ₹150 crore and above, as reported to MoSPI (Flash Report ${month}). State and city projects are not included.`;
export const CONTRACTS_COVERAGE='Assam state contract awards published in OCDS by CivicDataLab with the Assam Finance Department; tenders published 2019–2023. Awarded value is not money paid.';
function paging(p:Params){return {page:Math.max(1,Math.min(1000,Number(p.get('page'))||1)),size:Math.max(1,Math.min(100,Number(p.get('pageSize'))||25))};}
function paged<T>(rows:T[],p:Params){const {page,size}=paging(p);return {total:rows.length,page,pageSize:size,items:rows.slice((page-1)*size,page*size)};}
const search=(p:Params)=>(p.get('q')??'').toLowerCase().slice(0,100);
export function queryProjects(f:ProjectsFile,p:Params){
 const q=search(p),state=p.get('state'),ministry=p.get('ministry');const over=(x:Project)=>BigInt(x.latestRupees)-BigInt(x.originalRupees);
 const rows=f.projects.filter(x=>(!state||x.geographyIds.includes(state))&&(!ministry||x.ministry===ministry)&&(!q||x.name.toLowerCase().includes(q)||(x.agency??'').toLowerCase().includes(q))&&(p.get('delayed')!=='1'||(x.delayMonths??0)>0)&&(p.get('overCost')!=='1'||over(x)>0n))
  .sort(p.get('sort')==='delay'?(a,b)=>(b.delayMonths??-1)-(a.delayMonths??-1):p.get('sort')==='cost'?(a,b)=>Number(BigInt(b.latestRupees)-BigInt(a.latestRupees)):(a,b)=>Number(over(b)-over(a)));
 return {coverage:PROJECTS_COVERAGE(f.reportMonth),source:f.source,reportMonth:f.reportMonth,ministries:[...new Set(f.projects.map(x=>x.ministry))].sort(),...paged(rows,p)};
}
export function queryContracts(f:ContractsFile,p:Params){
 const q=search(p);const min=p.get('minRupees');const minPaise=min&&/^\d{1,13}$/.test(min)?BigInt(min)*100n:0n;
 const rows=f.contracts.filter((c:Contract)=>(!q||c.title.toLowerCase().includes(q)||c.contractorName.toLowerCase().includes(q)||(c.location??'').toLowerCase().includes(q))&&(!p.get('buyer')||c.buyer===p.get('buyer'))&&(!p.get('contractor')||c.contractorId===p.get('contractor'))&&(!p.get('fy')||fiscalYearOf(c.tenderPublished)===p.get('fy'))&&(p.get('checked')!=='1'||c.valueCheck==='plausible')&&(p.get('single')!=='1'||c.bidders===1)&&BigInt(c.awardPaise)>=minPaise)
  .sort(p.get('sort')==='date'?(a,b)=>(b.tenderPublished??'').localeCompare(a.tenderPublished??''):(a,b)=>Number(BigInt(b.awardPaise)-BigInt(a.awardPaise)));
 return {coverage:CONTRACTS_COVERAGE,source:f.source,excluded:f.excluded,buyers:[...new Set(f.contracts.map(c=>c.buyer))].sort(),...paged(rows,p)};
}
export function queryContractors(f:ContractsFile,p:Params){
 const q=search(p);
 const rows=f.contractors.filter(c=>!q||c.aliases.some(n=>n.toLowerCase().includes(q))).sort(p.get('sort')==='count'?(a,b)=>b.contracts-a.contracts:(a,b)=>Number(BigInt(b.checkedTotalPaise)-BigInt(a.checkedTotalPaise)));
 return {coverage:CONTRACTS_COVERAGE,source:f.source,excluded:f.excluded,...paged(rows,p)};
}
export function contractorProfile(f:ContractsFile,id:string){
 const c=f.contractors.find(x=>x.id===id);if(!c)return null;
 return {coverage:CONTRACTS_COVERAGE,source:f.source,excluded:f.excluded,contractor:c,contracts:f.contracts.filter(x=>x.contractorId===id).sort((a,b)=>(b.tenderPublished??'').localeCompare(a.tenderPublished??''))};
}
