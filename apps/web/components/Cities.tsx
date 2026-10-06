'use client';
import {useEffect,useState} from 'react';
import type {MoneyRecord,Source} from '../../../packages/schema/index';
import type {City} from '../../../connectors/cityfinance/index';
import {formatMoney} from '../../../packages/calculations/index';
import {loadJson} from '../lib/static-data';
import {shardOf} from '../../../packages/query/shard';
export type IndexCity={id:string;n:string;s:string|null;lat:number;lng:number;p:number|null;t:string;ys:number;l:{y:string;ti:string;te:string}|null};
type CityIndex={cities:IndexCity[]};export type LightCity=City&{ys:number;pg?:string};type StateCities={source:Source;cities:LightCity[]};
export const PUNE_CITYFINANCE_ID='5eb5844f76a3b61f40ba0694';
export {shortCityName} from '../lib/city-names';
/** English/Hindi names for NMAM line-item codes (the official names are shown in the source panel). */
export const NMAM:Record<string,[string,string]>={'110':['Tax revenue','कर राजस्व'],'120':['Assigned revenues & compensation','हस्तांतरित राजस्व और क्षतिपूर्ति'],'130':['Rental income from municipal properties','नगर संपत्तियों से किराया'],
 '140':['Fees & user charges','शुल्क और उपयोगकर्ता प्रभार'],'150':['Sale & hire charges','बिक्री और किराया प्रभार'],'160':['Revenue grants, contributions & subsidies','राजस्व अनुदान, अंशदान और सब्सिडी'],
 '170':['Income from investments','निवेश से आय'],'171':['Interest earned','अर्जित ब्याज'],'180':['Other income','अन्य आय'],'100':['Others (income)','अन्य (आय)'],
 '210':['Establishment expenses','स्थापना व्यय'],'220':['Administrative expenses','प्रशासनिक व्यय'],'230':['Operation & maintenance','संचालन और रखरखाव'],'240':['Interest & finance charges','ब्याज और वित्त प्रभार'],
 '250':['Programme expenses','कार्यक्रम व्यय'],'260':['Revenue grants, contributions & subsidies (paid)','दिए गए राजस्व अनुदान'],'270':['Provisions & write-offs','प्रावधान और बट्टे खाते'],'271':['Miscellaneous expenses','विविध व्यय'],
 '272':['Depreciation on fixed assets','स्थायी परिसंपत्तियों पर मूल्यह्रास'],'200':['Others (expenditure)','अन्य (व्यय)']};
export function useCityIndex(){
 const [index,setIndex]=useState<CityIndex|null>(null);
 useEffect(()=>{loadJson<CityIndex>('cities-major.json').then(setIndex).catch(()=>setIndex(null));},[]);
 return index;
}
/** One city with its yearly accounts (loaded from the state's small detail file on demand). A failed download is reported, never shown as "no accounts". */
export function useCity(stateId:string|null,light:LightCity|null){
 const [city,setCity]=useState<City|null>(null),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{setFailed(false);if(!light||!stateId){setCity(null);return;}if(!light.ys){setCity(light);return;}let live=true;setCity(null);
  loadJson<Record<string,City['years']>>(`cities/${stateId}/${shardOf(light.id)%8}.json`).then(d=>{if(live)setCity({...light,years:d[light.id]??{}});}).catch(()=>{if(live)setFailed(true);});return()=>{live=false;};},[stateId,light,attempt]);
 return {city,failed,retry:()=>setAttempt(a=>a+1)};
}
export function useStateCities(stateId:string|null){
 const [file,setFile]=useState<StateCities|null>(null),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{setFailed(false);setFile(null);if(!stateId)return;let live=true;loadJson<StateCities>(`cities/${stateId}.json`).then(f=>{if(live)setFile(f);}).catch(()=>{if(live)setFailed(true);});return()=>{live=false;};},[stateId,attempt]);
 return {file,failed,retry:()=>setAttempt(a=>a+1)};
}
/** A city-year as Paisa money records, so the shared cards, story and source panel can display it with provenance. */
export function cityRecords(city:City,year:string,source:Source):MoneyRecord[]{
 const y=city.years[year];if(!y)return [];
 const make=(code:string,amount:string,group:'municipal-income'|'municipal-expenditure'):MoneyRecord=>({id:`${source.id}:${city.id}:${code}:${year}`,metric:`nmam-${code}`,label:NMAM[code]?.[0]??code,labelHi:NMAM[code]?.[1]??code,group,fiscalYear:year,valueType:'ACTUAL',
  amountRupees:amount,sourceId:source.id,snapshotHash:source.sha256,sourcePage:1,rawValue:amount,rawUnit:'rupee',geographyId:city.id,parserVersion:source.parserVersion,retrievedAt:source.retrievedAt,status:'PUBLISHED',
  period:`FY ${year} · ${city.name} · standardised annual accounts (NMAM code ${code})`,notes:'Standardised by cityfinance.in from the city’s annual accounts. Categories can be grouped differently across years. Amounts are accrual-based and include non-cash items such as depreciation.'});
 return [...Object.entries(y.i).map(([c,a])=>make(c,a,'municipal-income')),...Object.entries(y.e).map(([c,a])=>make(c,a,'municipal-expenditure'))];
}
/** Income vs expenditure by year, as simple paired bars. Years without accounts are shown as gaps. */
export function CityTrend({city,years,active,hi,onYear}:{city:City;years:string[];active:string;hi:boolean;onYear:(y:string)=>void}){
 const vals=years.map(y=>city.years[y]?{y,ti:BigInt(city.years[y].ti),te:BigInt(city.years[y].te)}:{y,ti:0n,te:0n});const max=vals.reduce((m,v)=>v.ti>m?v.ti:v.te>m?v.te:m,1n);
 const h=(v:bigint)=>Number(v*1000n/max)/10;
 return <figure className="city-trend"><div className="trend-bars" role="img" aria-label={(hi?'वर्षवार आय और व्यय: ':'Income and expenditure by year: ')+vals.map(v=>`${v.y} ${v.ti?formatMoney(v.ti.toString()):hi?'डेटा नहीं':'no data'}`).join(', ')}>
  {vals.map(v=><button key={v.y} className={`trend-col ${v.y===active?'on':''}`} onClick={()=>v.ti&&onYear(v.y)} disabled={!v.ti} title={v.ti?`${v.y}: ${hi?'आय':'income'} ${formatMoney(v.ti.toString())} · ${hi?'व्यय':'spending'} ${formatMoney(v.te.toString())}`:`${v.y}: ${hi?'डेटा नहीं':'no data'}`}>
   <span className="pair"><i className="inc" style={{height:`${h(v.ti)}%`}}/><i className="exp" style={{height:`${h(v.te)}%`}}/></span><small>{v.y.slice(2,4)}–{v.y.slice(5)}</small></button>)}</div>
  <figcaption><span><i className="inc"/>{hi?'आय':'Income'}</span><span><i className="exp"/>{hi?'व्यय':'Expenditure'}</span></figcaption></figure>;
}
