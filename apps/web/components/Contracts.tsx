'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {ArrowLeft,ArrowRight,Building2,ChevronDown,ExternalLink,Info,Search,Users,X} from 'lucide-react';
import type {Contract,Contractor,Source} from '../../../packages/schema/index';
import type {LiveSignal} from '../../../packages/signals/contracts';
import {formatMoney} from '../../../packages/calculations/index';
import {staticApi} from '../lib/static-api';
import {loadJson} from '../lib/static-data';
import {shardOf} from '../../../packages/query/shard';
import {LoadError} from './LoadError';
import {Concern} from './Concern';
const rupees=(paise:string)=>formatMoney(((BigInt(paise)+50n)/100n).toString());
const day=(iso:string|null)=>iso?new Date(iso+'T00:00:00Z').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}):'Not published';
type Meta={coverage:string;source:Source;excluded:{reason:string;count:number}[]};
/** One API request. `error` is 'missing' when the item doesn't exist, 'failed' when the download failed (retry() tries again). */
function useApi<T>(url:string|null){
 const [attempt,setAttempt]=useState(0);
 const [state,setState]=useState<{data:T|null;error:null|'missing'|'failed';loading:boolean}>({data:null,error:null,loading:true});
 useEffect(()=>{if(!url)return;let live=true;setState(s=>({...s,loading:true,error:null}));staticApi<T>(url).then(d=>{if(live)setState({data:d,error:null,loading:false});})
  .catch((e:unknown)=>{if(live)setState({data:null,error:e instanceof Error&&e.message.startsWith('Not found')?'missing':'failed',loading:false});});return()=>{live=false;};},[url,attempt]);
 return {...state,retry:()=>setAttempt(a=>a+1)};
}
function SourceNote({meta,hi}:{meta:Meta;hi:boolean}){
 return <p className="contract-source"><Info size={14}/>{hi?'स्रोत':'Source'}: <a href={meta.source.url} target="_blank" rel="noreferrer">{meta.source.title}<ExternalLink size={11}/></a> · {meta.source.license.name}. {hi?'इसे CivicDataLab ने असम सरकार के वित्त विभाग के साथ असम ई-टेंडर पोर्टल से संकलित किया है। पैसा उस पोर्टल तक नहीं जाता।':'Compiled by CivicDataLab with Assam’s Finance Department from the state e-tender portal. Paisa does not access that portal.'}</p>;
}
const checkLabel=(c:Contract,hi:boolean)=>c.valueCheck==='plausible'?null:c.valueCheck==='implausible'?(hi?'शायद इकाई दर · योग में शामिल नहीं':'May be a unit rate · not in totals'):(hi?'अनुमान नहीं मिला · योग में शामिल नहीं':'No estimate to check · not in totals');
type Detail={ocid:string;tenderId:string;rawAward:string;category:string|null;method:string|null;contractorName:string;title?:string};
export function ContractRow({c,hi,showContractor=true,source}:{c:Contract;hi:boolean;showContractor?:boolean;source?:Source}){
 const warn=checkLabel(c,hi);const [detail,setDetail]=useState<Detail|null>(c.ocid?{ocid:c.ocid,tenderId:c.tenderId,rawAward:c.rawAward,category:c.category,method:c.method,contractorName:c.contractorName}:null);const [failed,setFailed]=useState(false);const d:Partial<Detail>=detail??{};
 return <li className="contract-row">
  <div className="contract-main"><strong>{c.title||(hi?'(शीर्षक प्रकाशित नहीं)':'(No title published)')}</strong>
   <small>{c.buyer}{c.location?` · ${c.location}`:''} · {hi?'निविदा':'Tender'} {day(c.tenderPublished)} · {c.bidders===null?(hi?'बोलियां: उपलब्ध नहीं':'Bids: not available'):`${c.bidders} ${hi?(c.bidders===1?'बोली':'बोलियां'):(c.bidders===1?'bid':'bids')}`}{c.estimatePaise?` · ${hi?'अनुमान':'estimate'} ${rupees(c.estimatePaise)}`:''}</small>
   {showContractor&&<Link className="contract-who" href={`/contractors?id=${encodeURIComponent(c.contractorId)}`}><Users size={13}/>{c.contractorName}</Link>}
  </div>
  <div className="contract-value"><small>{hi?'आवंटित मूल्य':'Awarded value'}</small><strong>{rupees(c.awardPaise)}</strong>{warn&&<span className="badge pending">{warn}</span>}{c.bidders===1&&<span className="badge single">{hi?'एकल बोली':'Single bid'}</span>}</div>
  <details className="contract-proof" onToggle={e=>{if((e.target as HTMLDetailsElement).open&&!detail)loadJson<Record<string,Detail>>(`contracts-detail/${shardOf(c.id)}.json`).then(d=>{setFailed(false);setDetail(d[c.id]??null);}).catch(()=>setFailed(true));}}><summary>{hi?'रिकॉर्ड विवरण':'Record details'}<ChevronDown size={13}/></summary>
   {failed&&<p className="muted small" role="alert">{hi?'विवरण लोड नहीं हुआ। बंद करके फिर खोलें।':'Details could not be loaded. Close and open again to retry.'}</p>}<dl>
   <div><dt>OCID</dt><dd><code>{d.ocid||'…'}</code></dd></div><div><dt>{hi?'निविदा आईडी':'Tender ID'}</dt><dd><code>{d.tenderId||'…'}</code></dd></div>
   {d.title&&d.title!==c.title&&<div><dt>{hi?'पूरा शीर्षक':'Full title'}</dt><dd>{d.title}</dd></div>}
   <div><dt>{hi?'प्रकाशित नाम':'Name as published'}</dt><dd>{d.contractorName||c.contractorName} <span className="link-tag verified">{hi?'सत्यापित कड़ी':'Verified link'}</span><br/><small className="muted">{hi?'इस अनुबंध के रिकॉर्ड में यही आपूर्तिकर्ता लिखा है। भुगतान रिकॉर्ड सार्वजनिक नहीं हैं।':'This award record names this supplier. Payment records are not public.'}</small></dd></div>
   <div><dt>{hi?'प्रकाशित मूल्य':'Value as published'}</dt><dd>₹{d.rawAward||'…'} → {c.awardPaise} paise</dd></div>
   <div><dt>{hi?'जांच':'Check'}</dt><dd>{c.valueCheck==='plausible'?(hi?'अनुमान के 0.1–10 गुना के भीतर':'Within 0.1–10× of the tender estimate'):warn}</dd></div>
   <div><dt>{hi?'श्रेणी / तरीका':'Category / method'}</dt><dd>{d.category??'—'} · {d.method??'—'}</dd></div>
  </dl>{source&&<Concern hi={hi} subject={{what:`${c.title||'Contract'} (${hi?'निविदा':'tender'} ${d.tenderId||c.id})`,amount:`${rupees(c.awardPaise)} (${hi?'आवंटित मूल्य':'awarded value'})`,period:`${hi?'निविदा प्रकाशित':'tender published'} ${day(c.tenderPublished)}`,authority:`${c.buyer}, Government of Assam`,level:'state',source:{title:source.title??'Assam OCDS',url:source.url}}}/>}</details>
 </li>;
}
export function ContractsExplorer({hi}:{hi:boolean}){
 const [q,setQ]=useState(''),[buyer,setBuyer]=useState(''),[single,setSingle]=useState(false),[sort,setSort]=useState('value'),[page,setPage]=useState(1),[items,setItems]=useState<Contract[]>([]);
 // A comparison set opened from a signal: one department's checked awards in one fiscal year.
 const [fy,setFy]=useState(''),[checked,setChecked]=useState(false),[ready,setReady]=useState(false);
 const [debounced,setDebounced]=useState('');useEffect(()=>{const id=setTimeout(()=>setDebounced(q),250);return()=>clearTimeout(id);},[q]);
 // Filters live in the address, so a search can be shared as a link.
 useEffect(()=>{const p=new URLSearchParams(window.location.search);const g=(k:string)=>p.get(k)??'';
  if(g('q')){setQ(g('q'));setDebounced(g('q'));}setBuyer(g('buyer'));setSingle(g('single')==='1');if(g('sort')==='date')setSort('date');if(/^\d{4}-\d{2}$/.test(g('fy')))setFy(g('fy'));setChecked(g('checked')==='1');setReady(true);},[]);
 useEffect(()=>{if(!ready)return;const u=new URL(window.location.href);const set=(k:string,v:string)=>{if(v)u.searchParams.set(k,v);else u.searchParams.delete(k);};
  set('q',debounced);set('buyer',buyer);set('single',single?'1':'');set('sort',sort==='value'?'':sort);set('fy',fy);set('checked',checked?'1':'');if(u.href!==window.location.href)window.history.replaceState(window.history.state,'',u);},[ready,debounced,buyer,single,sort,fy,checked]);
 const url=ready?`/api/v1/contracts?q=${encodeURIComponent(debounced)}&buyer=${encodeURIComponent(buyer)}&single=${single?1:0}&fy=${fy}&checked=${checked?1:0}&sort=${sort}&page=${page}&pageSize=25`:null;
 const {data,loading,error,retry}=useApi<Meta&{buyers:string[];total:number;page:number;items:Contract[]}>(url);
 useEffect(()=>{setPage(1);},[debounced,buyer,single,sort,fy,checked]);
 // Each response is added once, by the page it answers (so "Show more" never repeats rows).
 useEffect(()=>{if(data)setItems(prev=>data.page===1?data.items:[...prev,...data.items]);},[data]);
 const t=(a:string,b:string)=>hi?b:a;
 if(error)return <LoadError hi={hi} what={['Contract data','अनुबंध डेटा']} onRetry={retry}/>;
 return <section className="contracts">
  <div className="filter-row contract-filters"><label className="search-field"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={t('Search work, place or contractor…','काम, स्थान या ठेकेदार खोजें…')} aria-label={t('Search contracts','अनुबंध खोजें')}/></label>
   <label className="select-label">{t('Department','विभाग')}<select value={buyer} onChange={e=>setBuyer(e.target.value)}><option value="">{t('All departments','सभी विभाग')}</option>{data?.buyers.map(b=><option key={b}>{b}</option>)}</select></label>
   <label className="select-label">{t('Sort','क्रम')}<select value={sort} onChange={e=>setSort(e.target.value)}><option value="value">{t('Largest awarded value','सबसे बड़ा मूल्य')}</option><option value="date">{t('Newest tender','नवीनतम निविदा')}</option></select></label>
   <button className={`outline ${single?'pressed':''}`} aria-pressed={single} onClick={()=>setSingle(!single)}>{t('Only single-bid','केवल एकल बोली')}</button></div>
  {(fy||checked)&&<p className="filter-chip-row"><button className="filter-chip" onClick={()=>{setFy('');setChecked(false);}} aria-label={t('Remove this filter','यह फ़िल्टर हटाएं')}>{fy&&`${t('Fiscal year','वित्त वर्ष')} ${fy}`}{fy&&checked&&' · '}{checked&&t('checked awards only','केवल जांचे गए अनुबंध')}<X size={13}/></button></p>}
  {data&&<p className="muted small">{data.total.toLocaleString('en-IN')} {t('awards match','अनुबंध मिले')}</p>}
  <ul className="contract-list">{items.map(c=><ContractRow key={c.id} c={c} hi={hi} source={data?.source}/>)}</ul>
  {loading&&<p className="muted small">{t('Loading…','लोड हो रहा है…')}</p>}
  {data&&items.length<data.total&&!loading&&<button className="outline load-more" onClick={()=>setPage(page+1)}>{t('Show more','और दिखाएं')}</button>}
  {data&&<SourceNote meta={data} hi={hi}/>}
 </section>;
}
function ContractorProfile({id,hi}:{id:string;hi:boolean}){
 const {data,error,retry}=useApi<Meta&{contractor:Contractor;contracts:Contract[]}>(`/api/v1/contractors/${encodeURIComponent(id)}`);const t=(a:string,b:string)=>hi?b:a;
 if(error==='missing')return <p className="muted">{t('Contractor not found.','ठेकेदार नहीं मिला।')}</p>;if(error)return <LoadError hi={hi} what={['This contractor','यह ठेकेदार']} onRetry={retry}/>;if(!data)return <p className="muted small">{t('Loading…','लोड हो रहा है…')}</p>;
 const c=data.contractor;const max=c.buyers[0]?.contracts??1;
 return <section className="contractor-profile">
  <Link href="/contractors" className="text-link"><ArrowLeft size={14}/>{t('All contractors','सभी ठेकेदार')}</Link>
  <h2><Building2 size={22}/>{c.name}</h2>
  {c.aliases.length>1&&<p className="muted small">{t('Also published as','इस रूप में भी प्रकाशित')}: {c.aliases.filter(a=>a!==c.name).join(' · ')}</p>}
  <div className="card-totals profile-totals"><div><small>{t('Contracts found','मिले अनुबंध')}</small><strong>{c.contracts}</strong></div><div><small>{t('Total awarded value (checked)','कुल आवंटित मूल्य (जांचा)')}</small><strong>{rupees(c.checkedTotalPaise)}</strong><em>{c.checkedContracts} {t('of','में से')} {c.contracts} {t('contracts counted','अनुबंध गिने')}</em></div><div><small>{t('Departments','विभाग')}</small><strong>{c.buyers.length}</strong></div><div><small>{t('Single-bid wins','एकल-बोली जीत')}</small><strong>{c.singleBidWins}</strong></div></div>
  <div className="profile-grid"><div><h3>{t('Departments','विभाग')}</h3><ul className="per100">{c.buyers.slice(0,8).map(b=><li key={b.name}><span className="rest-label"><span>{b.name}</span><strong>{b.contracts}</strong></span><i style={{width:`${b.contracts/max*100}%`,background:'#2f7a64'}}/></li>)}</ul></div>
   <div><h3>{t('Tender years','निविदा वर्ष')}</h3><p className="year-chips">{c.years.map(y=><span key={y}>{y}</span>)}</p>
    <div className="info-banner"><Info size={16}/><p>{t('Awarded value is the value of the contract when awarded. It is not money actually paid; payment records are not public. Contracts are grouped by the exact published name, so different companies or people with the same name can appear together, and one company spelled differently appears separately.','आवंटित मूल्य अनुबंध देते समय का मूल्य है, वास्तविक भुगतान नहीं; भुगतान रिकॉर्ड सार्वजनिक नहीं हैं। अनुबंध प्रकाशित नाम के अनुसार समूहित हैं, इसलिए एक ही नाम के अलग लोग/कंपनियां साथ दिख सकते हैं।')}</p></div></div></div>
  <h3>{t('All contracts','सभी अनुबंध')} ({data.contracts.length})</h3><ul className="contract-list">{data.contracts.map(x=><ContractRow key={x.id} c={x} hi={hi} showContractor={false} source={data.source}/>)}</ul>
  <SourceNote meta={data} hi={hi}/>
 </section>;
}
export function ContractorsExplorer({hi}:{hi:boolean}){
 const params=useSearchParams();const id=params.get('id');
 const [q,setQ]=useState(''),[debounced,setDebounced]=useState(''),[sort,setSort]=useState('value'),[page,setPage]=useState(1),[items,setItems]=useState<Contractor[]>([]);
 useEffect(()=>{const x=setTimeout(()=>setDebounced(q),250);return()=>clearTimeout(x);},[q]);useEffect(()=>{setPage(1);},[debounced,sort]);
 const {data,loading,error,retry}=useApi<Meta&{total:number;page:number;items:Contractor[]}>(id?null:`/api/v1/contractors?q=${encodeURIComponent(debounced)}&sort=${sort}&page=${page}&pageSize=30`);
 useEffect(()=>{if(data)setItems(prev=>data.page===1?data.items:[...prev,...data.items]);},[data]);
 const t=(a:string,b:string)=>hi?b:a;
 if(id)return <ContractorProfile id={id} hi={hi}/>;
 if(error)return <LoadError hi={hi} what={['Contractor data','ठेकेदार डेटा']} onRetry={retry}/>;
 return <section className="contracts">
  <div className="filter-row contract-filters"><label className="search-field"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={t('Search a company or contractor…','कंपनी या ठेकेदार खोजें…')} aria-label={t('Search contractors','ठेकेदार खोजें')}/></label>
   <label className="select-label">{t('Sort','क्रम')}<select value={sort} onChange={e=>setSort(e.target.value)}><option value="value">{t('Total awarded value','कुल आवंटित मूल्य')}</option><option value="count">{t('Number of contracts','अनुबंधों की संख्या')}</option></select></label></div>
  {data&&<p className="muted small">{data.total.toLocaleString('en-IN')} {t('published names','प्रकाशित नाम')} · {t('totals count only awards that passed the estimate check','योग में केवल जांचे गए अनुबंध')}</p>}
  <div className="info-banner"><Info size={16}/><p>{t('Each entry groups awards by the supplier name exactly as published. The source has no company registration numbers, so different firms or people with the same name can appear together, and one firm spelled two ways appears twice.','हर प्रविष्टि आपूर्तिकर्ता के प्रकाशित नाम के अनुसार अनुबंधों को समूहित करती है। स्रोत में कंपनी पंजीकरण संख्या नहीं है, इसलिए एक ही नाम की अलग फ़र्में या लोग साथ दिख सकते हैं, और दो तरह से लिखी एक फ़र्म दो बार दिख सकती है।')}</p></div>
  <ul className="contractor-list">{items.map(c=><li key={c.id}><Link href={`/contractors?id=${encodeURIComponent(c.id)}`}><span><strong>{c.name}</strong><small>{c.contracts} {t(c.contracts===1?'contract':'contracts','अनुबंध')} · {c.buyers[0]?.name}{c.buyers.length>1?` +${c.buyers.length-1}`:''}</small></span><em>{rupees(c.checkedTotalPaise)}</em></Link></li>)}</ul>
  {loading&&<p className="muted small">{t('Loading…','लोड हो रहा है…')}</p>}
  {data&&items.length<data.total&&!loading&&<button className="outline load-more" onClick={()=>setPage(page+1)}>{t('Show more','और दिखाएं')}</button>}
  {data&&<SourceNote meta={data} hi={hi}/>}
 </section>;
}
const ruleNames:Record<string,[string,string]>={'cost-change':['Cost went up 25%+','लागत 25%+ बढ़ी'],'progress-gap':['Money ahead of work','काम से आगे पैसा'],'low-bids':['Single bid','एकल बोली'],concentration:['Supplier concentration','आपूर्तिकर्ता एकाग्रता']};
export function LiveSignals({hi}:{hi:boolean}){
 const [rule,setRule]=useState('cost-change'),[shown,setShown]=useState(20);const t=(a:string,b:string)=>hi?b:a;
 const {data,error,retry}=useApi<{records:LiveSignal[];counts:Record<string,number>;sources:Source[]}>(`/api/v1/signals?rule=${rule}`);useEffect(()=>setShown(20),[rule]);
 if(error)return <LoadError hi={hi} what={['Signals','संकेत']} onRetry={retry}/>;
 if(!data)return <p className="muted small">{t('Loading…','लोड हो रहा है…')}</p>;
 const describe=(s:LiveSignal)=>{const i=s.inputs as Record<string,string|number>;
  if(s.rule==='cost-change'){const o=BigInt(String(i.originalRupees)),c=BigInt(String(i.currentRupees));return t(`Approved cost ${formatMoney(o.toString())} is now ${formatMoney(c.toString())} (+${Number((c-o)*1000n/o)/10}%).`,`स्वीकृत लागत ${formatMoney(o.toString())} अब ${formatMoney(c.toString())} (+${Number((c-o)*1000n/o)/10}%)।`);}
  if(s.rule==='progress-gap')return t(`${i.financialPct}% of the current cost has been spent, but reported work done is ${i.physicalPct}%.`,`मौजूदा लागत का ${i.financialPct}% ख़र्च हुआ, पर रिपोर्ट किया गया काम ${i.physicalPct}% है।`);
  if(s.rule==='low-bids')return t('The published tender record lists one bid.','प्रकाशित निविदा रिकॉर्ड में एक बोली है।');
  const share=Math.round(Number(i.supplierAwardedRupees)/Number(i.comparisonAwardedRupees)*100);return t(`This published name received ${share}% of the checked awarded value of ${s.subject.buyer} in fiscal year ${s.set?.fy??''}.`,`इस प्रकाशित नाम को वित्त वर्ष ${s.set?.fy??''} में ${s.subject.buyer} के जांचे गए आवंटित मूल्य का ${share}% मिला।`);};
 return <section>
  <div className="tabs signal-tabs">{Object.entries(ruleNames).map(([k,[en,hn]])=><button key={k} className={rule===k?'selected':''} onClick={()=>setRule(k)}>{t(en,hn)} <span className="neutral-tag">{data.counts[k]??0}</span></button>)}</div>
  <div className="signals-grid">{data.records.slice(0,shown).map(s=><article className="panel signal-card" key={s.id}>
   <span className="badge pending">{t(...(ruleNames[s.rule]??[s.rule,s.rule]))}</span>
   <h3>{s.subject.type==='contractor'?<Link href={`/contractors?id=${encodeURIComponent(s.subject.id)}`}>{s.subject.label}</Link>:s.subject.label}</h3>
   <p className="muted small">{s.subject.buyer}{s.set?` · ${t('FY','वित्त वर्ष')} ${s.set.fy}`:''}</p><p>{describe(s)}</p>
   {s.set&&<Link className="text-link" href={`/contracts?buyer=${encodeURIComponent(s.set.buyer)}&fy=${s.set.fy}&checked=1`}>{t(`See all ${(s.inputs as Record<string,number>).contractCount} awards in this comparison`,`इस तुलना के सभी ${(s.inputs as Record<string,number>).contractCount} अनुबंध देखें`)}<ArrowRight size={13}/></Link>}
   <dl><div><dt>{t('Rule','नियम')}</dt><dd>{s.formula}</dd></div><div><dt>{t('Inputs','इनपुट')}</dt><dd>{Object.entries(s.inputs).map(([k,v])=>`${k}: ${v}`).join(' · ')}</dd></div><div><dt>{t('Period','अवधि')}</dt><dd>{s.comparisonPeriod}</dd></div><div><dt>{t('Source','स्रोत')}</dt><dd>{s.source}</dd></div><div><dt>{t('Limitations','सीमाएं')}</dt><dd>{s.limitations}</dd></div></dl>
   <small>{s.disclaimer}</small></article>)}</div>
  {shown<data.records.length&&<button className="outline load-more" onClick={()=>setShown(shown+20)}>{t('Show more','और दिखाएं')}</button>}
  <p className="contract-source"><Info size={14}/>{t('Sources','स्रोत')}: {data.sources.map(src=><a key={src.id} href={src.url} target="_blank" rel="noreferrer">{src.title}<ExternalLink size={11}/></a>)}</p>
 </section>;
}
