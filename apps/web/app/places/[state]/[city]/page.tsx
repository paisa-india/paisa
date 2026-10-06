import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {geographies} from '../../../../../../packages/schema/index';
import {apportion,formatMoney} from '../../../../../../packages/calculations/index';
import {loadCities,hasAccounts,type PlaceCity} from '../../../../lib/places-data';
import {plain} from '../../../../lib/municipal-labels';
import {shortCityName} from '../../../../lib/city-names';
import {href,absolute,SITE_URL} from '../../../../lib/site';
import {PlaceShell,breadcrumbLd,dateIST} from '../../../../components/PlaceShell';
type Params={params:Promise<{state:string;city:string}>};
// One page per city with published accounts, built ahead of time; no other addresses exist.
export const dynamicParams=false;
export async function generateStaticParams(){const {cities}=await loadCities();return cities.filter(hasAccounts).map(c=>({state:c.stateId!,city:c.page}));}
async function find(state:string,city:string){const all=await loadCities();const c=all.cities.find(x=>x.stateId===state&&x.page===city&&hasAccounts(x));const g=geographies.find(x=>x.id===state);return c&&g?{c,g,...all}:null;}
const years=(c:PlaceCity)=>Object.keys(c.years).sort();
/** Exact ₹100 split of one side of a year's accounts, largest first, with plain names. */
function per100(items:Record<string,string>){
 const rows=Object.entries(items).map(([code,a])=>({code,amount:BigInt(a)})).filter(r=>r.amount>0n).sort((a,b)=>Number(b.amount-a.amount));
 const parts=rows.length?apportion(100n,rows.map(r=>r.amount)):[];
 return rows.map((r,i)=>({...r,rupees:Number(parts[i]),label:plain[`nmam-${r.code}`]?.en??`Code ${r.code}`,bookkeeping:!!plain[`nmam-${r.code}`]?.bookkeeping}));
}
export async function generateMetadata({params}:Params):Promise<Metadata>{
 const {state,city}=await params;const f=await find(state,city);if(!f)return {};const {c,g}=f;const ys=years(c),y=ys.at(-1)!;const short=shortCityName(c.name);
 const title=`${short} municipal finances: income and spending${ys.length>1?` ${ys[0]} to ${y}`:` ${y}`}`;
 const description=`How ${c.name} (${g.name}) raised and spent its money, from its annual accounts: ${formatMoney(c.years[y].ti)} came in and ${formatMoney(c.years[y].te)} went out in ${y}. Every ₹100 explained, year by year, with the official source.`;
 const url=absolute(`/places/${state}/${city}/`);
 return {title,description,alternates:{canonical:url},openGraph:{title,description,url,type:'article'}};
}
export default async function CityPage({params}:Params){
 const {state,city}=await params;const f=await find(state,city);if(!f)notFound();const {c,g,source,cities}=f;
 const ys=years(c),y=ys.at(-1)!,latest=c.years[y];const short=shortCityName(c.name);
 const inc=per100(latest.i),out=per100(latest.e);const topIn=inc[0],topOut=out.find(r=>!r.bookkeeping);
 const mapHref=`/projects/?state=${state}&city=${c.id}&year=${y}`;
 const siblings=cities.filter(x=>x.stateId===state&&x.id!==c.id&&hasAccounts(x)).sort((a,b)=>(b.population??0)-(a.population??0)).slice(0,12);
 const url=absolute(`/places/${state}/${city}/`);const cf=`https://www.cityfinance.in/municipal-data/city/${c.slug}`;
 const dataset={'@context':'https://schema.org','@type':'Dataset',name:`${c.name}: income and expenditure, FY ${ys[0]} to ${y}`,
  description:`Annual income and expenditure of ${c.name}, ${g.name}, India, by National Municipal Accounts Manual category, for the financial years ${ys.join(', ')}. Standardised by cityfinance.in from the city's annual accounts; each year's items add up exactly to its published totals.`,
  url,isAccessibleForFree:true,isBasedOn:cf,creator:{'@type':'Organization',name:'PAISA',url:SITE_URL},spatialCoverage:{'@type':'Place',name:`${short}, ${g.name}, India`},
  temporalCoverage:`${ys[0].slice(0,4)}-04-01/${Number(y.slice(0,4))+1}-03-31`,variableMeasured:['Municipal income by category','Municipal expenditure by category']};
 return <PlaceShell crumbs={[['India','/places/'],[g.name,`/places/${state}/`],[short,null]]} jsonLd={[breadcrumbLd([['India',absolute('/places/')],[g.name,absolute(`/places/${state}/`)],[short,url]]),dataset]}>
  <header className="pp-head"><p className="pp-kicker">City · {g.name}{c.type?` · ${c.type}`:''}</p><h1>{short}: how the city’s money came in and went out</h1>
   <p className="pp-sub">{c.name}{c.population?` · population ${c.population.toLocaleString('en-IN')}`:''} · annual accounts for {ys.length} {ys.length===1?'year':'years'}</p></header>
  <p className="pp-lead">In {y}, {short} recorded <strong>{formatMoney(latest.ti)}</strong> of income and <strong>{formatMoney(latest.te)}</strong> of expenditure in its annual accounts.
   {topIn&&<> The largest source of income was {topIn.label.toLowerCase()} (₹{topIn.rupees} of every ₹100)</>}{topOut&&<>; the largest spending was {topOut.label.toLowerCase()} (₹{topOut.rupees} of every ₹100)</>}.</p>
  <p><a className="primary" href={href(mapHref)}>See {short} on the interactive map</a></p>
  <section className="pp-section"><h2>Every ₹100 in {y}</h2><div className="pp-cols">
   <div><h3>Came from</h3><ul className="pp-per100">{inc.map(r=><li key={r.code}><span>{r.label}</span><strong>{r.rupees<1?'under ₹1':`₹${r.rupees}`}</strong></li>)}</ul></div>
   <div><h3>Went to</h3><ul className="pp-per100">{out.map(r=><li key={r.code} className={r.bookkeeping?'bk':''}><span>{r.label}{r.bookkeeping?' (bookkeeping entry, not cash spent)':''}</span><strong>{r.rupees<1?'under ₹1':`₹${r.rupees}`}</strong></li>)}</ul></div></div>
   <p className="pp-note">Rounded to whole rupees out of ₹100; the parts always add up to exactly ₹100.</p></section>
  <section className="pp-section"><h2>Year by year</h2><div className="pp-scroll"><table className="pp-table"><thead><tr><th scope="col">Financial year</th><th scope="col">Income</th><th scope="col">Expenditure</th></tr></thead>
   <tbody>{ys.map(x=><tr key={x}><th scope="row">{x}</th><td>{formatMoney(c.years[x].ti)}</td><td>{formatMoney(c.years[x].te)}</td></tr>)}</tbody></table></div>
   <p className="pp-note">Years without published accounts, or whose items don’t add up to the published totals, are left out.</p></section>
  <section className="pp-section"><h2>Source</h2><p>Standardised annual accounts from <a href={cf} rel="noreferrer">cityfinance.in</a> (Ministry of Housing and Urban Affairs), prepared from {c.name}’s own accounts and retrieved on {dateIST(source.retrievedAt)}. These are accrual accounts, not the budget: depreciation and provisions are bookkeeping entries, and categories are sometimes grouped differently between years. Payments to individual suppliers are not published.</p></section>
  {siblings.length>0&&<section className="pp-section"><h2>More cities in {g.name}</h2><ul className="pp-links">{siblings.map(x=><li key={x.id}><a href={href(`/places/${state}/${x.page}/`)}>{shortCityName(x.name)}</a></li>)}</ul><p><a href={href(`/places/${state}/`)}>All cities and state finances of {g.name}</a></p></section>}
 </PlaceShell>;
}
