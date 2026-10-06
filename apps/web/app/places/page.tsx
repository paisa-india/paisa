import type {Metadata} from 'next';
import {geographies} from '../../../../packages/schema/index';
import {loadCities,hasAccounts} from '../../lib/places-data';
import {href,absolute,SITE_URL} from '../../lib/site';
import {PlaceShell} from '../../components/PlaceShell';
const url=absolute('/places/');
export const metadata:Metadata={title:'Every state and city: public money across India',
 description:'Pick a state or city to see where its public money comes from and goes: state finances, the annual accounts of 4,000+ cities, and central projects, with official sources.',
 alternates:{canonical:url},openGraph:{url}};
export default async function Places(){
 const {cities}=await loadCities();const n=(id:string)=>cities.filter(c=>c.stateId===id&&hasAccounts(c)).length;
 const states=geographies.filter(g=>g.parentId==='india').sort((a,b)=>a.name.localeCompare(b.name));const total=cities.filter(hasAccounts).length;
 const ld={'@context':'https://schema.org','@type':'Dataset',name:'Annual accounts of Indian cities (income and expenditure)',description:`Income and expenditure of ${total.toLocaleString('en-IN')} Indian urban local bodies by National Municipal Accounts Manual category, standardised by cityfinance.in from cities’ annual accounts. Each published year adds up exactly to its totals.`,
  url,isAccessibleForFree:true,isBasedOn:'https://www.cityfinance.in/',creator:{'@type':'Organization',name:'PAISA',url:SITE_URL},spatialCoverage:{'@type':'Place',name:'India'},variableMeasured:['Municipal income by category','Municipal expenditure by category'],
  distribution:[{'@type':'DataDownload',encodingFormat:'application/json',contentUrl:absolute('/data/cities-index.json')}]};
 return <PlaceShell crumbs={[['India',null]]} jsonLd={[ld]}>
  <header className="pp-head"><p className="pp-kicker">Places</p><h1>Every state and city</h1></header>
  <p className="pp-lead">Choose a state to see its finances, its central projects and the annual accounts of its cities. PAISA has accounts for <strong>{total.toLocaleString('en-IN')}</strong> cities and towns.</p>
  <ul className="pp-states">{states.map(g=><li key={g.id}><a href={href(`/places/${g.id}/`)}><strong>{g.name}</strong><small>{n(g.id)?`${n(g.id).toLocaleString('en-IN')} cities with accounts`:'state overview'}</small></a></li>)}</ul>
 </PlaceShell>;
}
