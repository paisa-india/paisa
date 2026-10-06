'use client';
import {trackUsage} from '../lib/analytics';
import {useId,useMemo,useState} from 'react';
import {MapPin,Search} from 'lucide-react';
import {loadJson} from '../lib/static-data';
import {geographies} from '../../../packages/schema/index';
import {shortCityName} from './Cities';
type Names={id:string[];n:string[];s:string[];ys:number[];p:number[]};
export type Place={kind:'state';id:string}|{kind:'city';id:string;stateId:string};
type Result={place:Place;label:string;detail:string;rank:number;p:number};
const fold=(x:string)=>x.normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
const states=geographies.filter(g=>g.parentId==='india');
/** Former or common names people still search for → the official name cityfinance uses. */
const ALIASES:[string,string][]=[['bombay','mumbai'],['madras','chennai'],['bangalore','bengaluru'],['calcutta','kolkata'],['gurgaon','gurugram'],['allahabad','prayagraj'],['aurangabad','sambhajinagar'],
 ['osmanabad','dharashiv'],['ahmednagar','ahilyanagar'],['mysore','mysuru'],['belgaum','belagavi'],['gulbarga','kalaburagi'],['hubli','hubballi'],['mangalore','mangaluru'],['trivandrum','thiruvananthapuram'],
 ['cochin','kochi'],['calicut','kozhikode'],['baroda','vadodara'],['pondicherry','puducherry'],['poona','pune'],['benares','varanasi'],['banaras','varanasi'],['simla','shimla'],['vizag','visakhapatnam']];
/** Search any city or state by name. The city list (about 65 KB) downloads only when someone starts typing. */
export function PlaceSearch({hi,onPick,big=false}:{hi:boolean;onPick:(p:Place)=>void;big?:boolean}){
 const [q,setQ]=useState(''),[open,setOpen]=useState(false),[active,setActive]=useState(0),[names,setNames]=useState<Names|null>(null),[failed,setFailed]=useState(false);
 const id=useId();const t=(a:string,b:string)=>hi?b:a;
 const load=()=>{if(names)return;setFailed(false);loadJson<Names>('cities-names.json').then(setNames).catch(()=>setFailed(true));};
 const stateName=(s:string)=>{const g=states.find(x=>x.id===s);return g?(hi?g.nameHi:g.name):s;};
 const results=useMemo(()=>{
  const f=fold(q);if(f.length<2)return [];const out:Result[]=[];
  for(const g of states)if(fold(g.name).startsWith(f)||g.nameHi.startsWith(q.trim()))out.push({place:{kind:'state',id:g.id},label:hi?g.nameHi:g.name,detail:t('State / UT','राज्य / केंद्र शासित प्रदेश'),rank:0,p:0});
  const terms=[f,...ALIASES.filter(([old])=>f.length>=3&&(old.startsWith(f)||f.startsWith(old))).map(([,now])=>now)];
  if(names)for(let i=0;i<names.id.length;i++){
   const short=fold(shortCityName(names.n[i])),full=fold(names.n[i]);
   const rank=terms.some(x=>short.startsWith(x))?1:terms.some(x=>full.includes(x))?2:-1;if(rank<0)continue;
   const ys=names.ys[i];
   out.push({place:{kind:'city',id:names.id[i],stateId:names.s[i]},label:shortCityName(names.n[i]),detail:`${stateName(names.s[i])} · ${ys?t(`${ys} ${ys===1?'year':'years'} of accounts`,`${ys} वर्षों के खाते`):t('no accounts published','खाते प्रकाशित नहीं')}`,rank,p:names.p[i]});
  }
  // States first, then name-starts-with before name-contains, bigger places first.
  return out.sort((a,b)=>a.rank-b.rank||b.p-a.p).slice(0,8);
 },[q,names,hi]);
 const pick=(r:Result)=>{trackUsage('place_selected');setQ('');setOpen(false);setActive(0);onPick(r.place);};
 const show=open&&fold(q).length>=2;
 return <div className={`place-search ${big?'big':''}`}>
  <label className="search-field"><Search size={big?19:17}/><input role="combobox" aria-expanded={show} aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={show&&results[active]?`${id}-${active}`:undefined}
   value={q} placeholder={t('Search your city or state…','अपना शहर या राज्य खोजें…')} aria-label={t('Search a city or state','शहर या राज्य खोजें')}
   onFocus={()=>{load();setOpen(true);}} onBlur={()=>setOpen(false)} onChange={e=>{setQ(e.target.value);setActive(0);setOpen(true);load();}}
   onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();setActive(a=>Math.min(a+1,results.length-1));}else if(e.key==='ArrowUp'){e.preventDefault();setActive(a=>Math.max(a-1,0));}
    else if(e.key==='Enter'&&results[active]){e.preventDefault();pick(results[active]);}else if(e.key==='Escape'){setOpen(false);}}}/></label>
  {show&&<ul className="place-results" id={`${id}-list`} role="listbox">
   {results.map((r,i)=><li key={r.place.kind+r.place.id} id={`${id}-${i}`} role="option" aria-selected={i===active} className={i===active?'active':''} onMouseDown={e=>{e.preventDefault();pick(r);}} onMouseEnter={()=>setActive(i)}>
    <MapPin size={15}/><span><strong>{r.label}</strong><small>{r.detail}</small></span></li>)}
   {!results.length&&<li className="place-empty" role="presentation">{failed?t('City list could not be loaded. Try again.','शहरों की सूची लोड नहीं हुई। फिर कोशिश करें।'):names?t('No city or state with that name.','इस नाम का कोई शहर या राज्य नहीं।'):t('Loading cities…','शहर लोड हो रहे हैं…')}</li>}
  </ul>}
 </div>;
}
