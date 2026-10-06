'use client';
import {useEffect,useRef,useState} from 'react';
import {CalendarClock,ChevronDown,ExternalLink,Info,Search} from 'lucide-react';
import type {Project,Source} from '../../../packages/schema/index';
import {formatMoney} from '../../../packages/calculations/index';
import {staticApi} from '../lib/static-api';
import {LoadError} from './LoadError';
import {Concern} from './Concern';
const mon=(ym:string|null,hi:boolean)=>{if(!ym)return hi?'प्रकाशित नहीं':'not published';const [y,m]=ym.split('-').map(Number);return new Date(Date.UTC(y,m-1,1)).toLocaleDateString(hi?'hi-IN':'en-IN',{month:'short',year:'numeric',timeZone:'UTC'});};
const pct=(a:bigint,b:bigint)=>b>0n?Number(a*1000n/b)/10:0;
const months=(ym:string)=>{const [y,m]=ym.split('-').map(Number);return y*12+m-1;};
/** Approval → original due date → revised due date, with the report month marked. Delay shows as the stretch past the original date. */
function Timeline({p,hi}:{p:Project;hi:boolean}){
 const t=(a:string,b:string)=>hi?b:a;const pts=[p.approved??p.started,p.originalCompletion,p.revisedCompletion,p.reportMonth].filter((x):x is string=>!!x&&/^\d{4}-\d{2}$/.test(x));
 if(!p.originalCompletion||pts.length<2)return null;
 const a=Math.min(...pts.map(months)),b=Math.max(...pts.map(months));const span=Math.max(1,b-a);const at=(ym:string)=>`${(months(ym)-a)/span*100}%`;
 const start=p.approved??p.started;const due=p.originalCompletion,now=p.revisedCompletion??p.originalCompletion;const late=months(now)>months(due);
 return <div className="timeline" role="img" aria-label={t(`Approved ${mon(start,hi)}, originally due ${mon(due,hi)}${late?`, now due ${mon(now,hi)}`:''}. Report month ${mon(p.reportMonth,hi)}.`,`स्वीकृत ${mon(start,hi)}, मूल लक्ष्य ${mon(due,hi)}${late?`, अब लक्ष्य ${mon(now,hi)}`:''}। रिपोर्ट माह ${mon(p.reportMonth,hi)}।`)}>
  <div className="tl-track">
   {start&&<i className="tl-plan" style={{left:at(start),width:`calc(${at(due)} - ${at(start)})`}}/>}
   {late&&<i className="tl-late" style={{left:at(due),width:`calc(${at(now)} - ${at(due)})`}}/>}
   {start&&<b className="tl-dot" style={{left:at(start)}}/>}<b className="tl-dot due" style={{left:at(due)}}/>{late&&<b className="tl-dot now" style={{left:at(now)}}/>}
   <span className={`tl-report ${(months(p.reportMonth)-a)/span>0.6?'flip':''}`} style={{left:at(p.reportMonth)}}><em>{t('Report','रिपोर्ट')} {mon(p.reportMonth,hi)}</em></span>
  </div>
  <div className="tl-labels" aria-hidden="true">{start&&<small style={{left:at(start)}}>{t('Approved','स्वीकृत')}<br/>{mon(start,hi)}</small>}<small className={late?'struck':''} style={{left:at(due)}}>{t('Due','लक्ष्य')}<br/>{mon(due,hi)}</small>{late&&<small className="late" style={{left:at(now)}}>{t('Now due','अब लक्ष्य')}<br/>{mon(now,hi)}</small>}</div>
 </div>;
}
/** One project, readable without finance knowledge: is it late, did it cost more, how much is done. */
export function ProjectCard({p,hi,source}:{p:Project;hi:boolean;source?:Source}){
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
  <Timeline p={p} hi={hi}/>
  <p className="project-time"><CalendarClock size={14}/>{t('Approved','स्वीकृत')} {mon(p.approved,hi)} · {t('due','लक्ष्य')} {mon(p.originalCompletion,hi)}{p.revisedCompletion&&p.revisedCompletion!==p.originalCompletion?<> → {t('now due','अब लक्ष्य')} <b>{mon(p.revisedCompletion,hi)}</b></>:null}</p>
  <details className="contract-proof"><summary>{t('Record details','रिकॉर्ड विवरण')}<ChevronDown size={13}/></summary><dl>
   <div><dt>{t('Ministry','मंत्रालय')}</dt><dd>{p.ministry}</dd></div><div><dt>{t('Project code','परियोजना कोड')}</dt><dd><code>{p.code}</code>{p.pmgId?` · PMG ${p.pmgId}`:''}{p.ocmsCode?` · OCMS ${p.ocmsCode}`:''}</dd></div>
   <div><dt>{t('Row as published','प्रकाशित पंक्ति')}</dt><dd><code>{p.rawRow}</code></dd></div><div><dt>{t('Report','रिपोर्ट')}</dt><dd>MoSPI Flash Report {p.reportMonth} · {t('row','पंक्ति')} {p.serial}</dd></div>
  </dl>{source&&<Concern hi={hi} subject={{what:p.name,amount:`${formatMoney(p.latestRupees)} (${t('latest approved cost','नवीनतम स्वीकृत लागत')})`,period:t(`as reported for ${mon(p.reportMonth,false)}`,`${mon(p.reportMonth,true)} की रिपोर्ट के अनुसार`),authority:p.ministry,level:'central',source:{title:source.title??'MoSPI Flash Report',url:source.url}}}/>}</details>
 </li>;
}
type Props={state:string|null;stateName:string;hi:boolean};
/** A new place starts a fresh list (filters, pages and results), so one place's projects never show under another's name. */
export function ProjectsList(props:Props){return <PlaceProjects key={props.state??'india'} {...props}/>;}
function PlaceProjects({state,stateName,hi}:Props){
 const t=(a:string,b:string)=>hi?b:a;const [error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 const [q,setQ]=useState(''),[deb,setDeb]=useState(''),[ministry,setMinistry]=useState(''),[late,setLate]=useState(false),[over,setOver]=useState(false),[sort,setSort]=useState('over'),[page,setPage]=useState(1),[items,setItems]=useState<Project[]>([]);
 const [data,setData]=useState<{total:number;items:Project[];ministries:string[];source:Source;reportMonth:string;coverage:string}|null>(null),[loading,setLoading]=useState(true);
 useEffect(()=>{const x=setTimeout(()=>setDeb(q),250);return()=>clearTimeout(x);},[q]);
 useEffect(()=>{setPage(1);},[deb,ministry,late,over,sort,state]);
 // Download only once the list scrolls into view.
 const ref=useRef<HTMLElement>(null);const [visible,setVisible]=useState(false);
 useEffect(()=>{const el=ref.current;if(!el||visible)return;const io=new IntersectionObserver(e=>{if(e.some(x=>x.isIntersecting)){setVisible(true);io.disconnect();}},{rootMargin:'0px',threshold:0.05});io.observe(el);return()=>io.disconnect();},[visible]);
 useEffect(()=>{if(!visible)return;let live=true;setLoading(true);setError(false);staticApi<NonNullable<typeof data>>(`/api/v1/projects?state=${state??''}&q=${encodeURIComponent(deb)}&ministry=${encodeURIComponent(ministry)}&delayed=${late?1:0}&overCost=${over?1:0}&sort=${sort}&page=${page}&pageSize=12`).then(d=>{if(!live)return;setData(d);setItems(prev=>page===1?d.items??[]:[...prev,...(d.items??[])]);setLoading(false);}).catch(()=>{if(live){setError(true);setLoading(false);}});return()=>{live=false;};},[visible,state,deb,ministry,late,over,sort,page,attempt]);
 if(data&&!data.source)return null;
 return <section ref={ref} className="panel projects-panel" id="projects" aria-labelledby="projects-title">
  <div className="panel-heading"><div><span className="eyebrow small">{t('BIG CENTRAL PROJECTS · ₹150 CRORE+','बड़ी केंद्रीय परियोजनाएं · ₹150 करोड़+')}{data?` · ${mon(data.reportMonth,hi)}`:''}</span><h2 id="projects-title">{t(`What is being built${state?` in ${stateName}`:''}, and is it on time?`,`${state?stateName+' में ':''}क्या बन रहा है, और क्या समय पर है?`)}</h2></div><span className="badge official">{t('Official','आधिकारिक')}</span></div>
  <div className="filter-row contract-filters"><label className="search-field"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={t('Search a project or agency…','परियोजना या एजेंसी खोजें…')} aria-label={t('Search projects','परियोजनाएं खोजें')}/></label>
   <label className="select-label">{t('Ministry','मंत्रालय')}<select value={ministry} onChange={e=>setMinistry(e.target.value)}><option value="">{t('All','सभी')}</option>{data?.ministries?.map(m=><option key={m}>{m}</option>)}</select></label>
   <label className="select-label">{t('Sort','क्रम')}<select value={sort} onChange={e=>setSort(e.target.value)}><option value="over">{t('Biggest cost increase','सबसे बड़ी लागत वृद्धि')}</option><option value="delay">{t('Most delayed','सबसे ज़्यादा देर')}</option><option value="cost">{t('Largest projects','सबसे बड़ी परियोजनाएं')}</option></select></label>
   <button className={`outline ${late?'pressed':''}`} aria-pressed={late} onClick={()=>setLate(!late)}>{t('Running late','देर से')}</button><button className={`outline ${over?'pressed':''}`} aria-pressed={over} onClick={()=>setOver(!over)}>{t('Cost went up','लागत बढ़ी')}</button></div>
  {data&&!error&&<p className="muted small">{data.total.toLocaleString('en-IN')} {t('projects','परियोजनाएं')}</p>}
  {data&&!error&&data.total===0&&!loading&&(deb||ministry||late||over?<p className="empty-note">{t('No projects match these filters.','इन फ़िल्टर से कोई परियोजना नहीं मिली।')}</p>
   :<p className="empty-note">{t(`This report lists no central projects of ₹150 crore or more in ${stateName||'this place'}.`,`इस रिपोर्ट में ${stateName||'इस जगह'} में ₹150 करोड़ या अधिक की कोई केंद्रीय परियोजना नहीं है।`)}</p>)}
  {error&&<LoadError hi={hi} what={['Projects','परियोजनाएं']} onRetry={()=>setAttempt(a=>a+1)}/>}
  <ul className="project-list">{items.map(p=><ProjectCard key={p.id} p={p} hi={hi} source={data?.source}/>)}</ul>
  {loading&&<p className="muted small">{t('Loading…','लोड हो रहा है…')}</p>}
  {data&&!error&&items.length<data.total&&!loading&&<button className="outline load-more" onClick={()=>setPage(page+1)}>{t('Show more','और दिखाएं')}</button>}
  {data?.source&&<p className="contract-source"><Info size={14}/>{t('Source','स्रोत')}: <a href={data.source.url} target="_blank" rel="noreferrer">{data.source.title}<ExternalLink size={11}/></a> · {t('as reported by ministries to MoSPI. “Late” compares the original and revised completion dates in the same report. State and city projects are not included.','मंत्रालयों द्वारा MoSPI को दी गई जानकारी। “देर” उसी रिपोर्ट की मूल और संशोधित समाप्ति तिथियों की तुलना है। राज्य और शहर की परियोजनाएं शामिल नहीं।')}</p>}
 </section>;
}
