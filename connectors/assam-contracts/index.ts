import type {Contract,Contractor,ContractsFile,Source} from '../../packages/schema/index';
import {ContractSchema} from '../../packages/schema/index';
import {unzip} from '../rbi-state-finances/xlsx';
export const parserVersion='assam-contracts/1.0.0';
/**
 * Assam public procurement in the Open Contracting Data Standard, compiled by CivicDataLab with the Assam Finance Department
 * from the state e-tender portal (ODbL). Paisa itself does not scrape the CAPTCHA-protected portal.
 */
export const ASSAM_REPO='CivicDataLab/assam-tenders-data';
export const ASSAM_PATH='data/ProcessedData/ocds-mapped-data/current/ocds_mapped_data.json.zip';
export const ASSAM_SOURCE_ID='assam-ocds-civicdatalab';
const first=<T,>(x:unknown):T|undefined=>(Array.isArray(x)?x[0]:x??undefined) as T|undefined;
/** The publisher writes dates as YYYY-DD-MM (the last part never exceeds 12). Returns ISO YYYY-MM-DD or null. */
export function normaliseDate(raw:unknown){
 const m=typeof raw==='string'?/^(\d{4})-(\d{2})-(\d{2})/.exec(raw):null;if(!m)return null;
 const [d,mo]=[Number(m[2]),Number(m[3])];if(mo<1||mo>12||d<1||d>31)return null;
 return `${m[1]}-${m[3]}-${m[2]}`;
}
/** Exact decimal rupees → integer paise. Rejects exponent notation and more than two decimals. */
export function toPaise(n:unknown){
 if(typeof n!=='number'||!Number.isFinite(n)||n<=0)return null;const s=String(n);
 const m=/^(\d+)(?:\.(\d{1,2}))?$/.exec(s);if(!m)return null;return (BigInt(m[1])*100n+BigInt((m[2]??'').padEnd(2,'0'))).toString();
}
/** Conservative identity: same name ignoring case, spacing and surrounding punctuation only. "ABC Construction" and "ABC Constructions" stay separate. */
export const contractorKey=(name:string)=>name.normalize('NFKC').toUpperCase().replace(/\s+/g,' ').replace(/^[\s.,]+|[\s.,]+$/g,'');
const slug=(key:string)=>'as-'+key.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)+'-'+[...key].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7).toString(36);
type Release={ocid?:string;buyer?:unknown;tender?:unknown;awards?:{id?:string;value?:unknown;suppliers?:{name?:string}[]}[];bids?:unknown};
export function parseAssam(raw:Uint8Array,source:Source):Omit<ContractsFile,'status'|'publishedAt'>{
 const files=unzip(raw);const json=files.get('package.json');if(!json)throw new Error('Assam OCDS: package.json missing');
 const pkg=JSON.parse(json.toString('utf8')) as {releases?:Release[];version?:string};
 if(!Array.isArray(pkg.releases)||pkg.releases.length<10000)throw new Error('Assam OCDS: unexpected package shape');
 const contracts:Contract[]=[];const excluded=new Map<string,number>();const skip=(r:string)=>excluded.set(r,(excluded.get(r)??0)+1);
 for(const r of pkg.releases){
  const tender=first<Record<string,unknown>>(r.tender)??{};const buyer=first<{name?:string}>(r.buyer)?.name?.trim();
  for(const a of r.awards??[]){
   const supplier=(a.suppliers??[])[0]?.name?.trim();const value=first<{amount?:unknown;currency?:string}>(a.value);
   if(!r.ocid||!buyer){skip('missing tender id or buyer');continue;}
   if(!supplier){skip('no supplier name');continue;}
   if((a.suppliers??[]).length!==1){skip('more than one supplier');continue;}
   if(value?.currency&&value.currency!=='INR'){skip('non-INR value');continue;}
   const award=toPaise(value?.amount);if(!award){skip('missing, zero or malformed award value');continue;}
   const estimate=toPaise(first<{amount?:unknown}>(tender.value)?.amount);
   // Awards far from the estimate are usually unit rates (₹ per trip, per labourer), so they are listed but kept out of totals.
   let check:Contract['valueCheck']='unchecked';
   if(estimate){const q=Number(BigInt(award)*1000n/BigInt(estimate))/1000;check=q>=0.1&&q<=10?'plausible':'implausible';}
   const bids=first<{details?:unknown[]}>(r.bids)?.details;const items=first<Record<string,unknown>>(tender.items);
   const key=contractorKey(supplier);
   contracts.push(ContractSchema.parse({id:`${r.ocid}/${a.id??'0'}`,ocid:r.ocid,tenderId:String(tender.id??r.ocid),title:String(tender.title??'').trim().slice(0,300),buyer,
    location:(first<{streetAddress?:string}>(items?.deliveryAddresses)?.streetAddress??'').trim()||null,
    category:(first<{description?:string}>(items?.classification)?.description??'').trim()||null,method:typeof tender.procurementMethod==='string'?tender.procurementMethod:null,
    tenderPublished:normaliseDate(tender.datePublished),estimatePaise:estimate,awardPaise:award,rawAward:String(value!.amount),bidders:Array.isArray(bids)?bids.length:null,
    contractorId:slug(key),contractorName:supplier,valueCheck:check,geographyId:'assam',sourceId:source.id}));
  }
 }
 if(new Set(contracts.map(c=>c.id)).size!==contracts.length)throw new Error('Assam OCDS: duplicate award ids');
 const byId=new Map<string,Contract[]>();for(const c of contracts){const l=byId.get(c.contractorId)??[];l.push(c);byId.set(c.contractorId,l);}
 const contractors:Contractor[]=[...byId.entries()].map(([id,list])=>{
  const checked=list.filter(c=>c.valueCheck==='plausible');const buyers=new Map<string,number>();for(const c of list)buyers.set(c.buyer,(buyers.get(c.buyer)??0)+1);
  const names=[...new Set(list.map(c=>c.contractorName))];
  return {id,name:names.sort((a,b)=>list.filter(c=>c.contractorName===b).length-list.filter(c=>c.contractorName===a).length)[0],aliases:names,contracts:list.length,checkedContracts:checked.length,
   checkedTotalPaise:checked.reduce((s,c)=>s+BigInt(c.awardPaise),0n).toString(),buyers:[...buyers.entries()].sort((a,b)=>b[1]-a[1]).map(([name,contracts])=>({name,contracts})),
   years:[...new Set(list.map(c=>c.tenderPublished?.slice(0,4)).filter((y):y is string=>!!y))].sort(),singleBidWins:list.filter(c=>c.bidders===1).length};
 });
 const total=contractors.reduce((s,c)=>s+BigInt(c.checkedTotalPaise),0n);const direct=contracts.filter(c=>c.valueCheck==='plausible').reduce((s,c)=>s+BigInt(c.awardPaise),0n);
 const validations=[
  {rule:`Assam contracts: ${contracts.length} awards parsed, unique ids`,passed:true,differenceRupees:'0',toleranceRupees:'0'},
  {rule:'Assam contracts: contractor totals add up to the sum of checked awards',passed:total===direct,differenceRupees:((total-direct)/100n).toString(),toleranceRupees:'0'}];
 if(validations.some(v=>!v.passed)||contracts.length<1000)throw new Error('Assam OCDS validation failed: '+JSON.stringify(validations));
 return {source,snapshotHash:source.sha256,parserVersion,contracts,contractors,excluded:[...excluded.entries()].map(([reason,count])=>({reason,count})),validations};
}
export function summarise(file:ContractsFile){
 return {sourceId:file.source.id,geographyId:'assam',awards:file.contracts.length,contractors:file.contractors.length,buyers:new Set(file.contracts.map(c=>c.buyer)).size,
  checkedTotalPaise:file.contractors.reduce((s,c)=>s+BigInt(c.checkedTotalPaise),0n).toString(),singleBid:file.contracts.filter(c=>c.bidders===1).length,
  years:[...new Set(file.contracts.map(c=>c.tenderPublished?.slice(0,4)).filter((y):y is string=>!!y))].sort()};
}
