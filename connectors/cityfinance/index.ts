import type {Source} from '../../packages/schema/index';
export const parserVersion='cityfinance/1.0.0';
export const CITYFINANCE_SOURCE_ID='cityfinance-ulb-accounts';
export const API='https://www.cityfinance.in/api/v1';
export const YEARS=['2015-16','2016-17','2017-18','2018-19','2019-20','2020-21','2021-22','2022-23','2023-24'];
/** National Municipal Accounts Manual (NMAM) codes in cityfinance's standardised income & expenditure statement. */
export const INCOME_CODES=['110','120','130','140','150','160','170','171','180','100'];
export const EXPENSE_CODES=['210','220','230','240','250','260','270','271','272','200'];
export type CityYear={i:Record<string,string>;e:Record<string,string>;ti:string;te:string};
export type City={id:string;name:string;slug:string;state:string;stateId:string|null;type:string;population:number|null;lat:number|null;lng:number|null;years:Record<string,CityYear>};
export type CitiesFile={status:'PUBLISHED';publishedAt:string;source:Source;parserVersion:string;cities:City[];excluded:{reason:string;count:number}[];validations:{rule:string;passed:boolean;differenceRupees:string;toleranceRupees:string}[]};
export type UlbListing={_id:string;name:string;slug:string;state:string;type?:string;natureOfUlb?:string;population?:number;location?:{lat?:string;lng?:string}};
/** cityfinance state names → Paisa geography ids (cityfinance uses some long official names). */
const STATE_ALIASES:Record<string,string>={'The Government of NCT of Delhi':'delhi','NCT of Delhi':'delhi','Delhi':'delhi','Andaman and Nicobar Islands':'andaman-nicobar','Jammu and Kashmir':'jammu-kashmir','Jammu & Kashmir':'jammu-kashmir',
 'Dadra and Nagar Haveli and Daman and Diu':'dnh-dd','Dadra & Nagar Haveli and Daman & Diu':'dnh-dd','Dadra and Nagar Haveli and Daman & Diu':'dnh-dd','Puducherry':'puducherry','Pondicherry':'puducherry','Odisha':'odisha','Orissa':'odisha','Uttarakhand':'uttarakhand','Uttaranchal':'uttarakhand'};
export function stateId(name:string){const n=name.trim();if(STATE_ALIASES[n])return STATE_ALIASES[n];const slug=n.toLowerCase().replace(/&/g,'and').replace(/[^a-z]+/g,'-').replace(/^-|-$/g,'');return slug||null;}
const rupees=(v:unknown)=>{if(typeof v!=='number'||!Number.isFinite(v))return null;if(!Number.isSafeInteger(Math.round(v)))throw new Error(`cityfinance: amount out of range ${v}`);return BigInt(Math.round(v));};
/**
 * Reads one city's statement response. A year counts only if its income and expenditure items add up exactly to the
 * published totals; totals of 0 mean "no data for that year".
 */
export function parseStatement(ulbId:string,rows:Record<string,unknown>[]):{years:Record<string,CityYear>;rejected:string[]}{
 const years:Record<string,CityYear>={};const rejected:string[]=[];
 const byCode=new Map<string,Record<string,unknown>>();for(const r of rows)if(r.code!==null&&r.code!==undefined&&/^\d{3}$/.test(String(r.code)))byCode.set(String(r.code),r);
 const totalIncome=rows.find(r=>r.key==='totalIncome');const totalExp=rows.find(r=>typeof r.lineItem==='string'&&r.lineItem.startsWith('Total Expenditure'));
 if(!totalIncome||!totalExp)throw new Error('cityfinance: statement layout changed (totals missing)');
 for(const fy of YEARS){
  const col=`${fy.slice(0,4)}${fy.slice(5)}_${ulbId}`;const ti=rupees(totalIncome[col])??0n,te=rupees(totalExp[col])??0n;
  if(ti===0n&&te===0n)continue;
  const pick=(codes:string[])=>{const out:Record<string,string>={};let sum=0n;for(const c of codes){const v=rupees(byCode.get(c)?.[col]);if(v!==null&&v!==0n){out[c]=v.toString();sum+=v;}}return {out,sum};};
  const inc=pick(INCOME_CODES),exp=pick(EXPENSE_CODES);
  // Exact: cityfinance computes the totals from these items; anything else means the statement is inconsistent.
  if(inc.sum!==ti||exp.sum!==te||ti<0n||te<0n){rejected.push(fy);continue;}
  years[fy]={i:inc.out,e:exp.out,ti:ti.toString(),te:te.toString()};
 }
 return {years,rejected};
}
export function cityFromListing(u:UlbListing,years:Record<string,CityYear>):City{
 const lat=Number(u.location?.lat),lng=Number(u.location?.lng);const valid=Number.isFinite(lat)&&Number.isFinite(lng)&&lat>6&&lat<38&&lng>68&&lng<98;
 return {id:u._id,name:u.name.trim(),slug:u.slug,state:u.state,stateId:stateId(u.state),type:u.type??u.natureOfUlb??'',population:typeof u.population==='number'&&u.population>0?u.population:null,lat:valid?lat:null,lng:valid?lng:null,years};
}
