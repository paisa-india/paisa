'use client';
import {CheckCircle2,Download,ExternalLink,FileSearch,Globe2,LayoutDashboard,ShieldCheck} from 'lucide-react';
import type {Dataset} from '../../../packages/schema/index';
type Group={id:string;name:string;nameHi:string;match:(id:string)=>boolean;automatic:boolean;cadence:string;cadenceHi:string;check:(rule:string)=>boolean;builtIn?:string;shown:string;shownHi:string};
const groups:Group[]=[
 {id:'union-budget',name:'Union Budget',nameHi:'केंद्रीय बजट',match:id=>/^bag\d$/.test(id),automatic:true,cadence:'Checked every day',cadenceHi:'रोज़ जांच',check:r=>/^\d{4}-\d{2} (BE|RE|ACTUAL):/.test(r),shown:'Home · Explore · My Tax · India card',shownHi:'होम · खोजें · मेरा कर · भारत कार्ड'},
 {id:'cga',name:'CGA monthly accounts',nameHi:'CGA मासिक लेखा',match:id=>id==='cga',automatic:true,cadence:'Checked every day',cadenceHi:'रोज़ जांच',check:()=>false,builtIn:'3 totals checks inside the reader',shown:'Home · “spent so far”',shownHi:'होम · “अब तक ख़र्च”'},
 {id:'pmc',name:'Pune Municipal Corporation accounts',nameHi:'पुणे महानगरपालिका खाते',match:id=>id.startsWith('pmc-'),automatic:true,cadence:'Checked every day',cadenceHi:'रोज़ जांच',check:r=>r.startsWith('PMC '),shown:'Map · Pune card · city money story',shownHi:'नक्शा · पुणे कार्ड · शहर की कहानी'},
 {id:'cities',name:'City accounts (cityfinance.in)',nameHi:'शहरों के खाते (cityfinance.in)',match:id=>id==='cityfinance-ulb-accounts',automatic:true,cadence:'Checked monthly · full refresh when the source updates',cadenceHi:'मासिक जांच',check:r=>r.startsWith('cityfinance'),shown:'Map city dots · city cards · city money stories',shownHi:'नक्शे पर शहर · शहर कार्ड · शहर की कहानी'},
 {id:'projects',name:'MoSPI big central projects',nameHi:'MoSPI बड़ी केंद्रीय परियोजनाएं',match:id=>id==='mospi-flash-report',automatic:true,cadence:'Checked every day · monthly report',cadenceHi:'रोज़ जांच · मासिक रिपोर्ट',check:r=>r.startsWith('MoSPI '),shown:'Map project list · state/India cards · Signals',shownHi:'नक्शा परियोजना सूची · राज्य/भारत कार्ड · संकेत'},
 {id:'contracts',name:'Assam contract awards',nameHi:'असम अनुबंध',match:id=>id.startsWith('assam-ocds'),automatic:true,cadence:'Checked every day · open dataset (CivicDataLab, ODbL)',cadenceHi:'रोज़ जांच · खुला डेटासेट',check:r=>r.startsWith('Assam contracts'),shown:'Contracts · Contractors · Signals · Assam card',shownHi:'अनुबंध · ठेकेदार · संकेत · असम कार्ड'},
 {id:'rbi',name:'RBI State Finances',nameHi:'RBI राज्य वित्त',match:id=>id.startsWith('rbi-'),automatic:false,cadence:'Yearly · downloaded by a person (RBI blocks scripts)',cadenceHi:'सालाना · व्यक्ति द्वारा डाउनलोड',check:r=>r.startsWith('RBI '),shown:'Map · 31 state cards · state story',shownHi:'नक्शा · 31 राज्य कार्ड · राज्य की कहानी'}
];
const when=(iso:string)=>new Date(iso).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
/** Shows each source's journey: official file → saved copy → values read → checks → where it appears. All counts come from the published dataset. */
export default function DataFlow({dataset,hi,runSummary}:{dataset:Dataset;hi:boolean;runSummary:string|null}){
 const t=(a:string,b:string)=>hi?b:a;
 const sharesCount=(id:string)=>dataset.sharesBySource?.[id]??(dataset.shares??[]).filter(r=>r.sourceId===id).length;const allShares=Object.values(dataset.sharesBySource??{}).reduce((a,b)=>a+b,0)||(dataset.shares??[]).length;const totalValues=dataset.records.length+allShares+(dataset.contractsSummary?.awards??0)+(dataset.projectsSummary?.projects??0)+(dataset.citiesSummary?.cityYears??0);// A summary rule like "248 component checks" stands for that many individual checks.
 const weight=(rule:string)=>Number(/(\d+) component checks/.exec(rule)?.[1]??1);
 const totalChecks=dataset.validations.filter(v=>v.passed).reduce((a,v)=>a+weight(v.rule),0);
 return <section className="dataflow" aria-labelledby="dataflow-title">
  <div className="panel-heading"><div><span className="eyebrow small">{t('HOW A NUMBER REACHES YOUR SCREEN','आंकड़ा आपकी स्क्रीन तक कैसे पहुँचता है')}</span><h2 id="dataflow-title">{t('Data flow','डेटा प्रवाह')}</h2></div><span className="neutral-tag">{t('Published','प्रकाशित')} {when(dataset.publishedAt)} IST</span></div>
  <div className="flow-totals"><div><strong>{dataset.sources.length}</strong><span>{t('official documents','आधिकारिक दस्तावेज़')}</span></div><i/><div><strong>{totalValues.toLocaleString('en-IN')}</strong><span>{t('values read','पढ़े गए मान')}</span></div><i/><div><strong>{totalChecks.toLocaleString('en-IN')}</strong><span>{t('checks passed','जांचें सफल')}</span></div><i/><div><strong>0</strong><span>{t('published numbers typed by hand','हाथ से टाइप किए प्रकाशित आंकड़े')}</span></div></div>
  {groups.map(g=>{const sources=dataset.sources.filter(s=>g.match(s.id));if(!sources.length)return null;
   const values=dataset.records.filter(r=>g.match(r.sourceId)).length+sources.reduce((a,s)=>a+sharesCount(s.id),0)+(g.id==='contracts'?dataset.contractsSummary?.awards??0:0)+(g.id==='projects'?dataset.projectsSummary?.projects??0:0)+(g.id==='cities'?dataset.citiesSummary?.cityYears??0:0);const checks=dataset.validations.filter(v=>v.passed&&g.check(v.rule)).reduce((a,v)=>a+weight(v.rule),0);
   const latest=sources.map(s=>s.retrievedAt).sort().at(-1)!;
   return <article className="flow-lane" key={g.id}>
    <h3>{hi?g.nameHi:g.name}<span className={`badge ${g.automatic?'official':'pending'}`}>{g.automatic?t('automatic','स्वचालित'):t('manual download','मैन्युअल डाउनलोड')}</span></h3>
    <ol className="flow-steps">
     <li><Globe2 size={18}/><strong>{t('Official source','आधिकारिक स्रोत')}</strong><small>{sources[0].authority??(g.id==='cga'?'Controller General of Accounts':'Ministry of Finance')}</small><small>{sources.length} {t(sources.length===1?'file':'files','फ़ाइलें')} · <a href={sources[0].url} target="_blank" rel="noreferrer">{t('open','खोलें')}<ExternalLink size={11}/></a></small></li>
     <li><Download size={18}/><strong>{t('Saved copy','सुरक्षित प्रति')}</strong><small>{when(latest)}</small><small className="mono">SHA-256 {sources[0].sha256.slice(0,10)}…</small><small>{hi?g.cadenceHi:g.cadence}</small></li>
     <li><FileSearch size={18}/><strong>{t('Values read','पढ़े गए मान')}</strong><small>{values.toLocaleString('en-IN')} {t('values','मान')}</small><small className="mono">{sources[0].parserVersion}</small></li>
     <li><ShieldCheck size={18}/><strong>{t('Checked','जांचा गया')}</strong><small>{g.builtIn?t(g.builtIn,'रीडर में 3 योग जांच'):`${checks} ${t('checks passed','जांचें सफल')}`}</small><small><CheckCircle2 size={11}/> {t('fails safe: old data stays if a check fails','जांच विफल हो तो पुराना डेटा बना रहता है')}</small></li>
     <li><LayoutDashboard size={18}/><strong>{t('Shown in','यहाँ दिखता है')}</strong><small>{hi?g.shownHi:g.shown}</small></li>
    </ol>
   </article>;})}
  {runSummary&&<details className="run-summary"><summary>{t('Last update run on this machine','इस मशीन पर अंतिम अपडेट रन')}</summary><pre>{runSummary}</pre></details>}
 </section>;
}
