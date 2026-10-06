import {href} from '../lib/site';
/** Light frame for the place pages: plain HTML that search engines and slow phones read easily, linking into the interactive map. */
export function PlaceShell({crumbs,children,jsonLd}:{crumbs:[string,string|null][];children:React.ReactNode;jsonLd?:object[]}){
 return <div className="pp">
  <header className="pp-top"><a href={href('/')} className="pp-brand"><img src={`${process.env.NEXT_PUBLIC_BASE_PATH??''}/brand/symbol.svg`} alt="" width={30} height={30}/><span>paisa<span className="brand-dot">.</span></span></a>
   <nav aria-label="Site"><a href={href('/projects/')}>Map</a><a href={href('/places/')}>All places</a><a href={href('/explore/')}>India’s budget</a><a href={href('/sources/')}>Sources</a></nav></header>
  <main className="pp-main">
   <nav className="pp-crumbs" aria-label="Breadcrumb"><ol>{crumbs.map(([label,to],i)=><li key={i}>{to?<a href={href(to)}>{label}</a>:<span aria-current="page">{label}</span>}</li>)}</ol></nav>
   {children}
  </main>
  <footer className="pp-foot"><p>PAISA is independent and open source. It is not affiliated with or endorsed by any government. Every figure links to its official source; automated observations are not findings of wrongdoing.</p></footer>
  {jsonLd?.map((d,i)=><script key={i} type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(d).replace(/</g,'\\u003c')}}/>)}
 </div>;
}
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
/** "5 Oct 2026" in IST, identical on every machine. */
export const dateIST=(iso:string)=>{const d=new Date(Date.parse(iso)+330*60000);return Number.isNaN(d.getTime())?iso:`${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;};
export function breadcrumbLd(items:[string,string][]){return {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:items.map(([name,item],i)=>({'@type':'ListItem',position:i+1,name,item}))};}
