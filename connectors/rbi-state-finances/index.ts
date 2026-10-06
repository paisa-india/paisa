import type {ShareRecord,Source} from '../../packages/schema/index';
import {readSheet} from './xlsx';
export const parserVersion='rbi-state-finances/1.0.0';
/** RBI's file server answers scripts with a bot challenge, so these annual files are downloaded by a maintainer in a browser. */
export const RBI_ARTIFACTS=[
 {id:'rbi-sf-2025-26-st33',statement:'33',file:'33_ST23012026BCEB3D627A5F437FB20248AF4A6A7AD7.XLSX',title:'RBI · State Finances 2025-26 · Statement 33 (revenue receipts)'},
 {id:'rbi-sf-2025-26-st34',statement:'34',file:'34_ST23012026C857071F901744E5844154DF5079FCB4.XLSX',title:'RBI · State Finances 2025-26 · Statement 34 (revenue expenditure)'}
] as const;
export const RBI_BASE='https://rbidocs.rbi.org.in/rdocs/Publications/DOCs/';
// RBI row label (number prefix removed) → Paisa geography id. All 31 rows must match.
const states:Record<string,string>={
 'Andhra Pradesh':'andhra-pradesh','Arunachal Pradesh':'arunachal-pradesh','Assam':'assam','Bihar':'bihar','Chhattisgarh':'chhattisgarh','Goa':'goa','Gujarat':'gujarat','Haryana':'haryana',
 'Himachal Pradesh':'himachal-pradesh','Jharkhand':'jharkhand','Karnataka':'karnataka','Kerala':'kerala','Madhya Pradesh':'madhya-pradesh','Maharashtra':'maharashtra','Manipur':'manipur',
 'Meghalaya':'meghalaya','Mizoram':'mizoram','Nagaland':'nagaland','Odisha':'odisha','Punjab':'punjab','Rajasthan':'rajasthan','Sikkim':'sikkim','Tamil Nadu':'tamil-nadu','Telangana':'telangana',
 'Tripura':'tripura','Uttar Pradesh':'uttar-pradesh','Uttarakhand':'uttarakhand','West Bengal':'west-bengal','Jammu and Kashmir':'jammu-kashmir','NCT Delhi':'delhi','Puducherry':'puducherry'
};
// 2023-24 is Accounts in this edition (the same publication's Statement 5 is titled "2023-24 (Accounts)").
const years:Record<string,[string,ShareRecord['valueType'],string]>={'2023-24':['2023-24','ACTUAL','2023-24 (Accounts)'],'2024-25 (BE)':['2024-25','BE','2024-25 (Budget Estimates)'],'2024-25 (RE)':['2024-25','RE','2024-25 (Revised Estimates)'],'2025-26 (BE)':['2025-26','BE','2025-26 (Budget Estimates)']};
const layout={
 '33':{title:'Statement 33 : Revenue Receipts of State Governments and UTs',metrics:['RR','OTR','ONTR','CT'],ids:['revenue-receipts','own-tax','own-non-tax','union-transfers']},
 '34':{title:'Statement 34: Revenue Expenditure of State Governments and UTs',metrics:['RE','DRE','NDRE','IP','PN'],ids:['revenue-expenditure','development','non-development','interest','pension']}
} as const;
const col=(n:number)=>{let s='';n++;while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=Math.floor((n-1)/26);}return s;};
/** Values are % of GSDP published to one decimal; stored as integer tenths of a per cent. */
export function toTenths(raw:string){const v=raw.trim();if(v==='–'||v==='-'||v==='')return 0;if(!/^\d+(\.\d+)?(E-?\d+)?$/i.test(v))throw new Error(`Unexpected value: ${raw}`);const n=Math.round(Number(v)*10);if(!Number.isSafeInteger(n)||n<0||n>1000)throw new Error(`Out of range: ${raw}`);return n;}
export function parseStatement(raw:Uint8Array,source:Source,statement:'33'|'34'):ShareRecord[]{
 const cells=readSheet(raw);const spec=layout[statement];const width=spec.metrics.length;const get=(ref:string)=>cells.get(ref)?.trim()??'';
 if(get('B2')!==spec.title)throw new Error(`RBI Statement ${statement}: unexpected title/schema`);
 if(get('B3')!=='(Per cent)'||get('B4')!=='State/UT')throw new Error(`RBI Statement ${statement}: unexpected header`);
 const blocks=Object.keys(years).map((label,b)=>{const start=2+b*width;if(get(`${col(start)}4`)!==label)throw new Error(`RBI Statement ${statement}: year column ${label} missing`);
  spec.metrics.forEach((m,i)=>{if(get(`${col(start+i)}5`)!==`${m}/GSDP`)throw new Error(`RBI Statement ${statement}: column ${m}/GSDP missing`);});return {start,label};});
 const records:ShareRecord[]=[];const seen=new Set<string>();
 for(let row=7;row<=37;row++){
  const name=get(`B${row}`).replace(/^\d+\.\s*/,'');const geographyId=states[name];if(!geographyId)throw new Error(`RBI Statement ${statement}: unknown row "${name}"`);seen.add(geographyId);
  for(const {start,label} of blocks){const [fiscalYear,valueType,period]=years[label];
   spec.metrics.forEach((m,i)=>{const ref=`${col(start+i)}${row}`;const rawValue=get(ref);
    records.push({id:`${source.id}:${geographyId}:${spec.ids[i]}:${fiscalYear}:${valueType}`,geographyId,statement,metric:spec.ids[i],fiscalYear,valueType,tenthsOfPercentGsdp:toTenths(rawValue),rawValue,cell:ref,sourceId:source.id,snapshotHash:source.sha256,parserVersion,retrievedAt:source.retrievedAt,status:'PUBLISHED',period});});}
 }
 if(seen.size!==31||!get('B38').startsWith('All States and UTs'))throw new Error(`RBI Statement ${statement}: expected 31 states/UTs and an all-India row`);
 return records;
}
/** Components must add up to the published total within rounding (each value is rounded to 0.1). */
export function validateShares(records:ShareRecord[]){
 const checks:{rule:string;passed:boolean;differenceRupees:string;toleranceRupees:string}[]=[];
 const by=new Map<string,ShareRecord>();for(const r of records)by.set(`${r.geographyId}|${r.fiscalYear}|${r.valueType}|${r.metric}`,r);
 const keys=[...new Set(records.map(r=>`${r.geographyId}|${r.fiscalYear}|${r.valueType}`))];
 let failures=0;
 for(const k of keys){const v=(m:string)=>by.get(`${k}|${m}`)?.tenthsOfPercentGsdp;
  const pairs:[string,number|undefined,number,number][]=[
   ['own tax + own non-tax + Union transfers = revenue receipts',v('revenue-receipts'),(v('own-tax')??NaN)+(v('own-non-tax')??NaN)+(v('union-transfers')??NaN),2],
  ];
  for(const [rule,total,parts,tol] of pairs){if(total===undefined)continue;const diff=total-parts;if(!(Math.abs(diff)<=tol))failures++;checks.push({rule:`RBI ${k.replaceAll('|',' ')}: ${rule}`,passed:Math.abs(diff)<=tol,differenceRupees:String(diff),toleranceRupees:String(tol)});}
  // Revenue expenditure = development + non-development + a residual RBI classifies in neither (up to ~1.2% of GSDP).
  const re=v('revenue-expenditure');if(re!==undefined){const other=re-(v('development')??NaN)-(v('non-development')??NaN);const ok=other>=-2&&other<=30;if(!ok)failures++;checks.push({rule:`RBI ${k.replaceAll('|',' ')}: development + non-development ≤ revenue expenditure`,passed:ok,differenceRupees:String(other),toleranceRupees:'2'});}
  const ip=v('interest'),pn=v('pension'),nd=v('non-development');if(ip!==undefined&&pn!==undefined&&nd!==undefined&&ip+pn>nd+1){failures++;checks.push({rule:`RBI ${k}: interest + pension within non-development`,passed:false,differenceRupees:String(ip+pn-nd),toleranceRupees:'1'});}
 }
 if(failures)throw new Error('RBI share reconciliation failed: '+JSON.stringify(checks.filter(c=>!c.passed).slice(0,5)));
 // Summarise per statement so the published validation list stays readable.
 return [{rule:`RBI State Finances: ${checks.length} component checks (31 states/UTs × 4 periods; receipts sum within 0.2 and spending parts never exceed the total by more than 0.2 percentage points of GSDP)`,passed:true,differenceRupees:'0',toleranceRupees:'0'}];
}
