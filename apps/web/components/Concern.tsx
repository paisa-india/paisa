'use client';
import {useState} from 'react';
import {AlertTriangle,Copy,ExternalLink,FileQuestion,Megaphone} from 'lucide-react';
/**
 * "Raise a concern": three different needs, three different routes. Paisa only prepares a draft and an evidence summary;
 * the person reviews it and submits it themselves on the official site. Nothing typed here is sent or saved.
 */
export type ConcernSubject={
 what:string;amount?:string;period:string;
 /** The public authority that published or spends the money. */
 authority:string;level:'central'|'state'|'city';
 source:{title:string;url:string;page?:number};
};
const REPO_URL=process.env.NEXT_PUBLIC_REPO_URL??'';
const CONTACT_EMAIL=process.env.NEXT_PUBLIC_CONTACT_EMAIL??'';
type Kind='data'|'rti'|'grievance';
export function Concern({subject:s,hi}:{subject:ConcernSubject;hi:boolean}){
 const [open,setOpen]=useState<Kind|null>(null);const t=(a:string,b:string)=>hi?b:a;
 const evidence=`${s.what}${s.amount?` — ${s.amount}`:''} · ${s.period}\n${t('Source','स्रोत')}: ${s.source.title}${s.source.page?`, ${t('page','पृष्ठ')} ${s.source.page}`:''}\n${s.source.url}`;
 const pageUrl=typeof window==='undefined'?'':window.location.href;
 const issue=REPO_URL?`${REPO_URL}/issues/new?${new URLSearchParams({template:'data-feedback.yml',title:`Data check: ${s.what} (${s.period})`,page:pageUrl,source:s.source.url,details:`${evidence}\n\nWhat looks wrong:\n`})}`
  :CONTACT_EMAIL?`mailto:${CONTACT_EMAIL}?${new URLSearchParams({subject:`Data check: ${s.what} (${s.period})`,body:`${evidence}\n${pageUrl}\n\nWhat looks wrong:\n`})}`.replace(/\+/g,'%20'):'';
 const options:[Kind,typeof AlertTriangle,string,string][]=[
  ['data',AlertTriangle,t('This figure looks wrong','यह आंकड़ा ग़लत लगता है'),t('Tell Paisa. The record and source are attached.','पैसा को बताएं। रिकॉर्ड और स्रोत साथ जुड़ा है।')],
  ['rti',FileQuestion,t('I need the underlying records','मुझे मूल रिकॉर्ड चाहिए'),t('Draft an RTI request to the right authority.','सही प्राधिकरण को RTI आवेदन का मसौदा।')],
  ['grievance',Megaphone,t('A service or project has a problem','किसी सेवा या परियोजना में समस्या है'),t('Draft a factual grievance for the official channel.','आधिकारिक माध्यम के लिए तथ्यात्मक शिकायत का मसौदा।')]];
 return <section className="concern" aria-labelledby="concern-title">
  <h3 id="concern-title">{t('Raise a concern','चिंता दर्ज करें')}</h3>
  <div className="concern-options">{options.map(([k,Icon,title,sub])=>k==='data'&&!issue?null:<button key={k} aria-expanded={open===k} className={open===k?'on':''} onClick={()=>setOpen(open===k?null:k)}><Icon size={17}/><span><strong>{title}</strong><small>{sub}</small></span></button>)}</div>
  {open==='data'&&issue&&<div className="concern-panel"><p>{t('This opens a public GitHub issue with the record and its source filled in. Add what looks wrong. Don’t include personal details.','इससे रिकॉर्ड और स्रोत के साथ एक सार्वजनिक GitHub issue खुलेगा। जो ग़लत लगे वह जोड़ें। निजी जानकारी न डालें।')}</p>
   <a className="primary" href={issue} target="_blank" rel="noreferrer">{t('Report to Paisa','पैसा को रिपोर्ट करें')}<ExternalLink size={15}/></a></div>}
  {open==='rti'&&<Draft hi={hi} key="rti" text={rtiDraft(s,hi)} evidence={evidence} route={s.level==='central'
   ?{label:t('RTI Online (central government authorities)','RTI Online (केंद्र सरकार के प्राधिकरण)'),url:'https://rtionline.gov.in/',note:t('For central ministries and departments. Fee ₹10, payable online.','केंद्र के मंत्रालयों और विभागों के लिए। शुल्क ₹10, ऑनलाइन।')}
   :{label:null,url:null,note:t(`${s.authority} is a ${s.level==='city'?'city':'state'} authority, which RTI Online does not cover. Send the request to its Public Information Officer by post, or through the state’s own RTI portal if it has one. Check the fee under the state’s RTI rules.`,`${s.authority} ${s.level==='city'?'शहर':'राज्य'} का प्राधिकरण है, जो RTI Online में शामिल नहीं। अनुरोध उसके जन सूचना अधिकारी को डाक से भेजें, या राज्य के अपने RTI पोर्टल से, अगर हो। शुल्क राज्य के RTI नियमों में देखें।`)}}/>}
  {open==='grievance'&&<Draft hi={hi} key="grievance" text={grievanceDraft(s,hi)} evidence={evidence} route={s.level==='central'
   ?{label:t('CPGRAMS (central public grievances)','CPGRAMS (केंद्र की लोक शिकायत)'),url:'https://pgportal.gov.in/',note:t('For problems with central ministries’ services and projects. Not for RTI requests.','केंद्र के मंत्रालयों की सेवाओं और परियोजनाओं की समस्याओं के लिए। RTI अनुरोधों के लिए नहीं।')}
   :{label:null,url:null,note:t(`Send it to ${s.authority}’s own grievance portal or helpline (see its website), or the state’s public grievance portal. Paisa does not list unofficial channels.`,`इसे ${s.authority} के अपने शिकायत पोर्टल या हेल्पलाइन (उसकी वेबसाइट देखें), या राज्य के लोक शिकायत पोर्टल पर भेजें। पैसा अनौपचारिक माध्यम नहीं बताता।`)}}/>}
  <p className="muted small">{t('A cost increase or a single bid can justify asking for an explanation. It does not establish wrongdoing. To report suspected corruption, use the Central Vigilance Commission or your state Lokayukta.','लागत बढ़ना या एकल बोली स्पष्टीकरण मांगने का कारण हो सकता है, गड़बड़ी का प्रमाण नहीं। संदिग्ध भ्रष्टाचार की शिकायत केंद्रीय सतर्कता आयोग या राज्य लोकायुक्त से करें।')}</p>
 </section>;
}
function Draft({hi,text,evidence,route}:{hi:boolean;text:string;evidence:string;route:{label:string|null;url:string|null;note:string}}){
 const t=(a:string,b:string)=>hi?b:a;const [draft,setDraft]=useState(text),[copied,setCopied]=useState(false);
 const copy=async()=>{try{await navigator.clipboard.writeText(draft);setCopied(true);}catch{setCopied(false);}};
 return <div className="concern-panel">
  <label className="draft-label">{t('Your draft (edit before sending)','आपका मसौदा (भेजने से पहले बदलें)')}<textarea value={draft} onChange={e=>{setDraft(e.target.value);setCopied(false);}} rows={12}/></label>
  <details className="draft-evidence"><summary>{t('Evidence summary','सबूत का सारांश')}</summary><pre>{evidence}</pre></details>
  <div className="draft-actions"><button className="outline" onClick={copy}><Copy size={14}/>{copied?t('Copied','कॉपी हुआ'):t('Copy draft','मसौदा कॉपी करें')}</button>
   {route.url&&<a className="primary" href={route.url} target="_blank" rel="noreferrer">{route.label}<ExternalLink size={15}/></a>}</div>
  <p className="muted small">{route.note}</p>
  <p className="draft-status" role="status">{copied?t('Draft prepared and copied. It has not been submitted: paste it into the official site and submit it there.','मसौदा तैयार और कॉपी हुआ। यह जमा नहीं हुआ है: इसे आधिकारिक साइट पर चिपकाकर वहीं जमा करें।')
   :t('Draft prepared, not submitted. Paisa does not send or save it; your name and address stay with you.','मसौदा तैयार, जमा नहीं हुआ। पैसा इसे न भेजता है न सहेजता है; आपका नाम और पता आपके पास रहता है।')}</p>
 </div>;
}
const ref=(s:ConcernSubject)=>`"${s.source.title}"${s.source.page?`, page ${s.source.page}`:''} (${s.source.url})`;
function rtiDraft(s:ConcernSubject,hi:boolean){
 if(hi)return `सेवा में,\nजन सूचना अधिकारी,\n${s.authority}\n\nविषय: सूचना का अधिकार अधिनियम, 2005 के अंतर्गत सूचना हेतु आवेदन\n\nकृपया निम्नलिखित सूचना प्रदान करें:\n1. "${s.what}"${s.amount?` (${s.amount})`:''}, ${s.period} के आंकड़े से संबंधित अभिलेखों की प्रमाणित प्रतियां, जैसा ${ref(s)} में प्रकाशित है।\n2. इस राशि का योजना/लेखा शीर्ष और माह-वार विवरण।\n3. [अपनी विशिष्ट आवश्यकता यहां लिखें]\n\nमैं भारत का/की नागरिक हूं। आवेदन शुल्क लागू नियमों के अनुसार संलग्न है।\n\nनाम:\nपता:\nदिनांक:`;
 return `To\nThe Public Information Officer,\n${s.authority}\n\nSubject: Request for information under the Right to Information Act, 2005\n\nPlease provide:\n1. Certified copies of the records supporting the figure "${s.what}"${s.amount?` of ${s.amount}`:''} for ${s.period}, as published in ${ref(s)}.\n2. A breakdown of this amount by scheme or head of account, and by month.\n3. [Add anything specific you need]\n\nI am a citizen of India. The application fee is paid as required by the applicable RTI rules.\n\nName:\nAddress:\nDate:`;
}
function grievanceDraft(s:ConcernSubject,hi:boolean){
 if(hi)return `विषय: ${s.what} — स्पष्टीकरण का अनुरोध (${s.period})\n\n${ref(s)} के अनुसार, ${s.period} में "${s.what}"${s.amount?` ${s.amount}`:''} था/थी।\n\nसमस्या: [कहां, कब और क्या हुआ — केवल तथ्य लिखें]\n\nअनुरोध: [आप क्या कार्रवाई चाहते हैं]\n\nनाम:\nसंपर्क:`;
 return `Subject: ${s.what} — request for an explanation (${s.period})\n\nAccording to ${ref(s)}, "${s.what}" was${s.amount?` ${s.amount}`:' recorded'} for ${s.period}.\n\nThe problem: [Where, when and what happened. Facts only.]\n\nWhat I am asking for: [The action you want the authority to take.]\n\nName:\nContact:`;
}
