import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {geographies} from '../../../../../packages/schema/index';
import {apportion,formatMoney} from '../../../../../packages/calculations/index';
import {readDataset,readProjects} from '../../../../../packages/db/repository';
import {loadCities,hasAccounts} from '../../../lib/places-data';
import {shortCityName} from '../../../lib/city-names';
import {shareLabels,shareView,periodKind,type ShareItem} from '../../../lib/state-shares';
import {href,absolute} from '../../../lib/site';
import {PlaceShell,breadcrumbLd} from '../../../components/PlaceShell';
type Params={params:Promise<{state:string}>};
const states=geographies.filter(g=>g.parentId==='india');
export const dynamicParams=false;
export function generateStaticParams(){return states.map(g=>({state:g.id}));}
async function facts(id:string){
 const g=states.find(x=>x.id===id);if(!g)return null;
 const [{cities},d,pf]=await Promise.all([loadCities(),readDataset(),readProjects()]);
 const here=cities.filter(c=>c.stateId===id);const withAcc=here.filter(hasAccounts).sort((a,b)=>(b.population??0)-(a.population??0));
 const shares=(d.shares??[]).filter(s=>s.geographyId===id);const year=[...new Set(shares.map(s=>s.fiscalYear))].sort().at(-1);const view=year?shareView(shares,year):null;
 const projects=(pf?.projects??[]).filter(p=>p.geographyIds.includes(id));
 return {g,here,withAcc,view,year,projects,reportMonth:pf?.reportMonth};
}
export async function generateMetadata({params}:Params):Promise<Metadata>{
 const {state}=await params;const f=await facts(state);if(!f)return {};const {g,withAcc,projects,view}=f;
 const title=`${g.name}: state finances, ${withAcc.length.toLocaleString('en-IN')} city accounts and central projects`;
 const description=`Public money in ${g.name}: ${view?'where every ₹100 of the state’s income comes from and how day-to-day spending splits (RBI), ':''}income and spending of ${withAcc.length.toLocaleString('en-IN')} cities, and ${projects.length} central projects of ₹150 crore or more, with official sources.`;
 const url=absolute(`/places/${state}/`);
 return {title,description,alternates:{canonical:url},openGraph:{title,description,url}};
}
function Split({items}:{items:ShareItem[]}){
 const sorted=[...items].sort((a,b)=>Number(b.weight-a.weight));const parts=apportion(100n,sorted.map(i=>i.weight));
 return <ul className="pp-per100">{sorted.map((it,i)=><li key={it.key}><span>{shareLabels[it.key].en}</span><strong>₹{parts[i].toString()}</strong></li>)}</ul>;
}
export default async function StatePage({params}:Params){
 const {state}=await params;const f=await facts(state);if(!f)notFound();const {g,here,withAcc,view,year,projects,reportMonth}=f;
 const late=projects.filter(p=>(p.delayMonths??0)>0).length,costUp=projects.filter(p=>BigInt(p.latestRupees)>BigInt(p.originalRupees)).length;
 const biggest=[...projects].sort((a,b)=>Number(BigInt(b.latestRupees)-BigInt(a.latestRupees))).slice(0,8);const url=absolute(`/places/${state}/`);
 return <PlaceShell crumbs={[['India','/places/'],[g.name,null]]} jsonLd={[breadcrumbLd([['India',absolute('/places/')],[g.name,url]])]}>
  <header className="pp-head"><p className="pp-kicker">{g.type==='ut'?'Union Territory':'State'} · {g.nameHi}</p><h1>{g.name}: where public money comes from and goes</h1></header>
  <p className="pp-lead">{view&&year?<>In {year} ({periodKind(view.kind,false)}), the state government’s day-to-day income (revenue receipts, including money from the Union) was about {view.size}% of the size of its economy (GSDP). </>:null}
   PAISA has the annual accounts of <strong>{withAcc.length.toLocaleString('en-IN')}</strong> of its {here.length.toLocaleString('en-IN')} urban local bodies, and {projects.length} central projects of ₹150 crore or more.</p>
  <p><a className="primary" href={href(`/projects/?state=${state}`)}>Open {g.name} on the interactive map</a></p>
  <section className="pp-section"><h2>State finances</h2>{view&&year?<><div className="pp-cols"><div><h3>Every ₹100 of income came from</h3><Split items={view.income}/></div><div><h3>Every ₹100 of day-to-day spending went to</h3><Split items={view.spend}/></div></div>
   <p className="pp-note">{year}, {periodKind(view.kind,false)}. Shares worked out from RBI’s <em>State Finances: A Study of Budgets</em> (ratios to GSDP); revenue account only, so capital spending is not included.</p></>
   :<p>RBI’s study of state budgets covers states and Union Territories with their own legislature. {g.name} is not in it, so PAISA does not show its state finances.</p>}</section>
  <section className="pp-section"><h2>Cities and towns</h2>{withAcc.length?<><ul className="pp-links">{withAcc.map(c=><li key={c.id}><a href={href(`/places/${state}/${c.page}/`)}>{shortCityName(c.name)}</a></li>)}</ul>
   {here.length>withAcc.length&&<p className="pp-note">{(here.length-withAcc.length).toLocaleString('en-IN')} more urban local bodies are listed on cityfinance.in without published accounts.</p>}</>
   :<p>No urban local body in {g.name} has standardised accounts on cityfinance.in yet.</p>}</section>
  <section className="pp-section"><h2>Central projects (₹150 crore or more)</h2>{projects.length?<>
   <p>{projects.length} projects listed{reportMonth?` in MoSPI’s report for ${reportMonth}`:''}: {late} running late and {costUp} costing more than first approved. A delay or cost increase is a reason to ask questions, not proof of wrongdoing.</p>
   <div className="pp-scroll"><table className="pp-table"><thead><tr><th scope="col">Project</th><th scope="col">Ministry</th><th scope="col">Cost now</th><th scope="col">Delay</th></tr></thead>
    <tbody>{biggest.map(p=><tr key={p.id}><th scope="row">{p.name}</th><td>{p.ministry}</td><td>{formatMoney(p.latestRupees)}</td><td>{(p.delayMonths??0)>0?`${p.delayMonths} months`:p.delayMonths===0?'None reported':'Not reported'}</td></tr>)}</tbody></table></div>
   <p><a href={href(`/projects/?state=${state}#projects`)}>All {projects.length} projects in {g.name}</a></p></>:<p>MoSPI’s report lists no central projects of ₹150 crore or more in {g.name}.</p>}</section>
 </PlaceShell>;
}
