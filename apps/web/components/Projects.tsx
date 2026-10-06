'use client';
import {useEffect,useRef,useState} from 'react';
import {CalendarClock,ChevronDown,ExternalLink,Info,Search} from 'lucide-react';
import type {Project,Source} from '../../../packages/schema/index';
import {formatMoney} from '../../../packages/calculations/index';
import {staticApi} from '../lib/static-api';
const mon=(ym:string|null,hi:boolean)=>{if(!ym)return hi?'प्रकाशित नहीं':'not published';const [y,m]=ym.split('-').map(Number);return new Date(Date.UTC(y,m-1,1)).toLocaleDateString(hi?'hi-IN':'en-IN',{month:'short',year:'numeric',timeZone:'UTC'});};
const pct=(a:bigint,b:bigint)=>b>0n?Number(a*1000n/b)/10:0;
/** One project, readable without finance knowledge: is it late, did it cost more, how much is done. */
export function ProjectCard({p,hi}:{p:Project;hi:boolean}){
 const t=(a:string,b:string)=>hi?b:a;const o=BigInt(p.originalRupees),l=BigInt(p.latestRupees),e=BigInt(p.expenditureRupees??'0');
 const due=p.revisedCompletion??p.originalCompletion;const up=l>o?pct(l-o,o):0,max=l>o?l:o,spent=pct(e,l),done=p.physicalProgress===null?null:Number(p.physicalProgress);
 return <li className="project-card">
  <div className="project-head"><strong>{p.name}</strong><small>{p.agency??t('Agency not published','एजेंसी प्रकाशित नहीं')} · {p.sector} · {p.stateLabel}</small></div>
  <div className="project-badges">{(p.delayMonths??0)>0?<span className="badge late">{t(`${p.delayMonths} months late`,`${p.delayMonths} महीने देर`)}</span>:p.delayMonths===0?<span className="badge official">{t('No delay reported','देरी रिपोर्ट नहीं')}</span>:null}{due&&due<p.reportMonth&&<span className="badge late">{t(`Past due date (${mon(due,hi)})`,`समय-सीमा बीत चुकी (${mon(due,hi)})`)}</span>}{up>0&&<span className="badge costup">{t(`Cost +${up}%`,`लागत +${up}%`)}</span>}</div>
  <div className="project-bars">
   <div><span className="bar-label-row"><span>{t('Cost','लागत')}</span><span>{t('approved','स्वीकृत')} {formatMoney(p.originalRupees)}{l!==o&&<> → <b>{t('now','अब')} {formatMoney(p.latestRupees)}</b></>}</span></span>
    <span className="cost-track"><i className="orig" style={{width:`${pct(o,max)}%`}}/>{l>o&&<i className="extra" style={{left:`${pct(o,max)}%`,width:`${pct(l-o,max)}%`}}/>}</span></div>
   <div><span className="bar-label-row"><span>{t('Work done','काम पूरा')}</span><span>{done===null?t('not reported','रिपोर्ट नहीं'):`${done}%`}</span></span><span className="cost-track"><i className="done" style={{width:`${Math.min(100,done??0)}%`}}/></span></div>
   <div><span className="bar-label-row"><span>{t('Money spent','पैसा ख़र्च')}</span><span>{p.expenditureRupees?`${formatMoney(p.expenditureRupees)} · ${spent}% ${t('of current cost','मौजूदा लागत का')}`:t('not reported','रिपोर्ट नहीं')}</span></span><span className="cost-track"><i className="spent" style={{width:`${Math.min(100,spent)}%`}}/></span></div>
  </div>
  <p className="project-time"><CalendarClock size={14}/>{t('Approved','स्वीकृत')} {mon(p.approved,hi)} · {t('due','लक्ष्य')} {mon(p.originalCompletion,hi)}{p.revisedCompletion&&p.revisedCompletion!==p.originalCompletion?<> → {t('now due','अब लक्ष्य')} <b>{mon(p.revisedCompletion,hi)}</b></>:null}</p>
  <details className="contract-proof"><summary>{t('Record details','रिकॉर्ड विवरण')}<ChevronDown size={13}/></summary><dl>
   <div><dt>{t('Ministry','मंत्रालय')}</dt><dd>{p.ministry}</dd></div><div><dt>{t('Project code','परियोजना कोड')}</dt><dd><code>{p.code}</code>{p.pmgId?` · PMG ${p.pmgId}`:''}{p.ocmsCode?` · OCMS ${p.ocmsCode}`:''}</dd></div>
   <div><dt>{t('Row as published','प्रकाशित पंक्ति')}</dt><dd><code>{p.rawRow}</code></dd></div><div><dt>{t('Report','रिपोर्ट')}</dt><dd>MoSPI Flash Report {p.reportMonth} · {t('row','पंक्ति')} {p.serial}</dd></div>
  </dl></details>
 </li>;
}
export function ProjectsList({state,stateName,hi}:{state:string|null;stateName:string;hi:boolean}){
 const t=(a:string,b:string)=>hi?b:a;
 const [q,setQ]=useState(''),[deb,setDeb]=useState(''),[ministry,setMinistry]=useState(''),[late,setLate]=useState(false),[over,setOver]=useState(false),[sort,setSort]=useState('over'),[page,setPage]=useState(1),[items,setItems]=useState<Project[]>([]);
 const [data,setData]=useState<{total:number;items:Project[];ministries:string[];source:Source;reportMonth:string;coverage:string}|null>(null),[loading,setLoading]=useState(true);
 useEffect(()=>{const x=setTimeout(()=>setDeb(q),250);return()=>clearTimeout(x);},[q]);
 useEffect(()=>{setPage(1);},[deb,ministry,late,over,sort,state]);
 // Download only once the list scrolls into view.
 const ref=useRef<HTMLElement>(null);const [visible,setVisible]=useState(false);
 useEffect(()=>{const el=ref.current;if(!el||visible)return;const io=new IntersectionObserver(e=>{if(e.some(x=>x.isIntersecting)){setVisible(true);io.disconnect();}},{rootMargin:'0px',threshold:0.05});io.observe(el);return()=>io.disconnect();},[visible]);
 useEffect(()=>{if(!visible)return;let live=true;setLoading(true);staticApi<NonNullable<typeof data>>(`/api/v1/projects?state=${state??''}&q=${encodeURIComponent(deb)}&ministry=${encodeURIComponent(ministry)}&delayed=${late?1:0}&overCost=${over?1:0}&sort=${sort}&page=${page}&pageSize=12`).then(d=>{if(!live)return;setData(d);setItems(prev=>page===1?d.items??[]:[...prev,...(d.items??[])]);setLoading(false);}).catch(()=>live&&setLoading(false));return()=>{live=false;};},[visible,state,deb,ministry,late,over,sort,page]);
 if(data&&!data.source)return null;
 return <section ref={ref} className="panel projects-panel" id="projects" aria-labelledby="projects-title">
  <div className="panel-heading"><div><span className="eyebrow small">{t('BIG CENTRAL PROJECTS · ₹150 CRORE+','बड़ी केंद्रीय परियोजनाएं · ₹150 करोड़+')}{data?` · ${mon(data.reportMonth,hi)}`:''}</span><h2 id="projects-title">{t(`What is being built${state?` in ${stateName}`:''}, and is it on time?`,`${state?stateName+' में ':''}क्या बन रहा है, और क्या समय पर है?`)}</h2></div><span className="badge official">{t('Official','आधिकारिक')}</span></div>
  <div className="filter-row contract-filters"><label className="search-field"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={t('Search a project or agency…','परियोजना या एजेंसी खोजें…')} aria-label={t('Search projects','परियोजनाएं खोजें')}/></label>
   <label className="select-label">{t('Ministry','मंत्रालय')}<select value={ministry} onChange={e=>setMinistry(e.target.value)}><option value="">{t('All','सभी')}</option>{data?.ministries?.map(m=><option key={m}>{m}</option>)}</select></label>
   <label className="select-label">{t('Sort','क्रम')}<select value={sort} onChange={e=>setSort(e.target.value)}><option value="over">{t('Biggest cost increase','सबसे बड़ी लागत वृद्धि')}</option><option value="delay">{t('Most delayed','सबसे ज़्यादा देर')}</option><option value="cost">{t('Largest projects','सबसे बड़ी परियोजनाएं')}</option></select></label>
   <button className={`outline ${late?'pressed':''}`} aria-pressed={late} onClick={()=>setLate(!late)}>{t('Running late','देर से')}</button><button className={`outline ${over?'pressed':''}`} aria-pressed={over} onClick={()=>setOver(!over)}>{t('Cost went up','लागत बढ़ी')}</button></div>
  {data&&<p className="muted small">{data.total.toLocaleString('en-IN')} {t('projects','परियोजनाएं')}</p>}
  <ul className="project-list">{items.map(p=><ProjectCard key={p.id} p={p} hi={hi}/>)}</ul>
  {loading&&<p className="muted small">{t('Loading…','लोड हो रहा है…')}</p>}
  {data&&items.length<data.total&&!loading&&<button className="outline load-more" onClick={()=>setPage(page+1)}>{t('Show more','और दिखाएं')}</button>}
  {data?.source&&<p className="contract-source"><Info size={14}/>{t('Source','स्रोत')}: <a href={data.source.url} target="_blank" rel="noreferrer">{data.source.title}<ExternalLink size={11}/></a> · {t('as reported by ministries to MoSPI. “Late” compares the original and revised completion dates in the same report. State and city projects are not included.','मंत्रालयों द्वारा MoSPI को दी गई जानकारी। “देर” उसी रिपोर्ट की मूल और संशोधित समाप्ति तिथियों की तुलना है। राज्य और शहर की परियोजनाएं शामिल नहीं।')}</p>}
 </section>;
}
