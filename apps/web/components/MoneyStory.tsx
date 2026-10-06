'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowRight,Building2,ChevronLeft,ChevronRight,Coins,FileText,Home,Info,Landmark,Pause,Play,ReceiptText,Users} from 'lucide-react';
import type {MoneyRecord} from '../../../packages/schema/index';
import {apportion,formatMoney} from '../../../packages/calculations/index';
import {TILES,assignTiles,placeTiles,orderCategories,categoryColor,categoryRank,spareColor} from '../lib/tiles';
/** Everyday words for each audited line. `bookkeeping` marks entries that are not cash actually spent or received. */
export const plain:Record<string,{en:string;hi:string;what:string;whatHi:string;bookkeeping?:boolean}>={
 'property-water-tax':{en:'Home & water taxes',hi:'घर और पानी के कर',what:'Tax on homes, shops and land, plus water charges. Includes amounts billed but not yet paid.',whatHi:'घर, दुकान और ज़मीन पर कर, साथ में पानी का शुल्क। इसमें वह राशि भी है जिसका बिल बना पर अभी भुगतान नहीं हुआ।'},
 'lbt-gst':{en:'Share from Maharashtra (GST)',hi:'महाराष्ट्र से हिस्सा (जीएसटी)',what:'The State pays the city this money because GST replaced the old local tax.',whatHi:'राज्य यह पैसा शहर को देता है क्योंकि जीएसटी ने पुराने स्थानीय कर की जगह ली।'},
 'fees-user-charges':{en:'Building permits & fees',hi:'भवन अनुमति और शुल्क',what:'Fees for building permission, licences and city services.',whatHi:'भवन अनुमति, लाइसेंस और शहर की सेवाओं का शुल्क।'},
 'revenue-grants':{en:'Grants for schemes',hi:'योजनाओं के अनुदान',what:'Money from Central and State schemes, such as housing and health.',whatHi:'केंद्र और राज्य की योजनाओं से पैसा, जैसे आवास और स्वास्थ्य।'},
 'interest-earned':{en:'Interest on savings',hi:'बचत पर ब्याज',what:'Interest the city earns on its bank deposits.',whatHi:'शहर को अपनी बैंक जमा पर मिलने वाला ब्याज।'},
 'rental-income':{en:'Rent from city property',hi:'शहर की संपत्ति का किराया',what:'Rent from shops, halls, land and buildings the city owns.',whatHi:'शहर की दुकानों, हॉल, ज़मीन और इमारतों का किराया।'},
 'other-income':{en:'Other income',hi:'अन्य आय',what:'Smaller items such as fines and lapsed deposits.',whatHi:'छोटी मदें, जैसे जुर्माना और ज़ब्त जमा।'},
 'sales-hire':{en:'Sales & hire charges',hi:'बिक्री और किराया शुल्क',what:'Selling items and hiring out equipment.',whatHi:'सामान बेचना और उपकरण किराये पर देना।'},
 'other-taxes':{en:'Entertainment tax share',hi:'मनोरंजन कर का हिस्सा',what:'The city’s share of entertainment tax.',whatHi:'मनोरंजन कर में शहर का हिस्सा।'},
 'establishment':{en:'Staff salaries & pensions',hi:'कर्मचारियों का वेतन और पेंशन',what:'Pay and pensions for teachers, health workers, engineers, cleaners and other staff.',whatHi:'शिक्षकों, स्वास्थ्यकर्मियों, इंजीनियरों, सफ़ाईकर्मियों और अन्य कर्मचारियों का वेतन और पेंशन।'},
 'provision-overdues':{en:'Set aside for unpaid taxes',hi:'बकाया कर के लिए अलग रखा',what:'Not money spent. An accounting entry for old taxes and rent that may never be collected.',whatHi:'यह ख़र्च नहीं है। पुराने कर और किराये के लिए हिसाब की प्रविष्टि जो शायद कभी वसूल न हों।',bookkeeping:true},
 'operations-maintenance':{en:'Running the city',hi:'शहर चलाना',what:'Electricity, water supply, garbage collection, cleaning and contract staff.',whatHi:'बिजली, पानी की आपूर्ति, कचरा संग्रह, सफ़ाई और ठेका कर्मचारी।'},
 'grants-subsidies':{en:'Grants to other bodies',hi:'अन्य संस्थाओं को अनुदान',what:'Grants and contributions the city gives to other public bodies.',whatHi:'शहर द्वारा अन्य सार्वजनिक संस्थाओं को दिए गए अनुदान और अंशदान।'},
 'administrative':{en:'Offices & administration',hi:'कार्यालय और प्रशासन',what:'Office running costs, legal fees, printing, phones and vehicles.',whatHi:'कार्यालय का ख़र्च, क़ानूनी शुल्क, छपाई, फ़ोन और वाहन।'},
 'repairs-assets':{en:'Repairs: roads, pipes, buildings',hi:'मरम्मत: सड़क, पाइप, इमारतें',what:'Fixing existing roads, water lines, drains, bridges and buildings. New construction is not included here.',whatHi:'मौजूदा सड़कों, पानी की लाइनों, नालियों, पुलों और इमारतों की मरम्मत। नया निर्माण इसमें शामिल नहीं।'},
 'interest-finance':{en:'Interest on loans',hi:'कर्ज़ पर ब्याज',what:'Interest on money the city borrowed through municipal bonds.',whatHi:'नगर बॉन्ड से लिए कर्ज़ पर ब्याज।'},
 'miscellaneous':{en:'Miscellaneous',hi:'विविध',what:'Small items that fit nowhere else.',whatHi:'छोटी मदें जो कहीं और नहीं आतीं।'},
 'nmam-110':{en:'Local taxes (mainly property tax)',hi:'स्थानीय कर (मुख्यतः संपत्ति कर)',what:'Taxes the city collects itself, mainly property tax. In some years this also includes tax shares passed on by the State.',whatHi:'शहर द्वारा स्वयं वसूले कर, मुख्यतः संपत्ति कर।'},
 'nmam-120':{en:'Share of State taxes',hi:'राज्य करों में हिस्सा',what:'Money the State passes on to the city, such as compensation for taxes the State now collects.',whatHi:'राज्य द्वारा शहर को दिया गया पैसा, जैसे राज्य द्वारा वसूले करों की क्षतिपूर्ति।'},
 'nmam-130':{en:'Rent from city property',hi:'शहर की संपत्ति का किराया',what:'Rent from shops, halls, land and buildings the city owns.',whatHi:'शहर की दुकानों, हॉल, ज़मीन और इमारतों का किराया।'},
 'nmam-140':{en:'Fees & service charges',hi:'शुल्क और सेवा प्रभार',what:'Building permissions, licences, water and other service charges.',whatHi:'भवन अनुमति, लाइसेंस, पानी और अन्य सेवा शुल्क।'},
 'nmam-150':{en:'Sales & hire charges',hi:'बिक्री और किराया शुल्क',what:'Selling items and hiring out equipment.',whatHi:'सामान बेचना और उपकरण किराये पर देना।'},
 'nmam-160':{en:'Grants from State & Centre',hi:'राज्य और केंद्र से अनुदान',what:'Grants for running costs and schemes from the State and Central governments.',whatHi:'राज्य और केंद्र सरकार से योजनाओं और ख़र्च के लिए अनुदान।'},
 'nmam-170':{en:'Income from investments',hi:'निवेश से आय',what:'Returns on the city’s investments.',whatHi:'शहर के निवेश से आय।'},
 'nmam-171':{en:'Interest on savings',hi:'बचत पर ब्याज',what:'Interest on the city’s bank deposits.',whatHi:'शहर की बैंक जमा पर ब्याज।'},
 'nmam-180':{en:'Other income',hi:'अन्य आय',what:'Smaller items such as fines.',whatHi:'छोटी मदें, जैसे जुर्माना।'},
 'nmam-100':{en:'Other income',hi:'अन्य आय',what:'Income not classified elsewhere.',whatHi:'अन्य वर्गीकृत न की गई आय।'},
 'nmam-210':{en:'Staff salaries & pensions',hi:'कर्मचारियों का वेतन और पेंशन',what:'Pay, allowances and pensions of city staff.',whatHi:'शहर के कर्मचारियों का वेतन, भत्ते और पेंशन।'},
 'nmam-220':{en:'Offices & administration',hi:'कार्यालय और प्रशासन',what:'Office costs, fees, printing, phones and vehicles.',whatHi:'कार्यालय ख़र्च, शुल्क, छपाई, फ़ोन और वाहन।'},
 'nmam-230':{en:'Running the city',hi:'शहर चलाना',what:'Water supply, cleaning, garbage, street lights, power and repairs.',whatHi:'पानी, सफ़ाई, कचरा, स्ट्रीट लाइट, बिजली और मरम्मत।'},
 'nmam-240':{en:'Interest on loans',hi:'कर्ज़ पर ब्याज',what:'Interest on money the city borrowed.',whatHi:'शहर द्वारा लिए कर्ज़ पर ब्याज।'},
 'nmam-250':{en:'Events & programmes',hi:'कार्यक्रम',what:'Programmes run by the city.',whatHi:'शहर द्वारा चलाए गए कार्यक्रम।'},
 'nmam-260':{en:'Grants to other bodies',hi:'अन्य संस्थाओं को अनुदान',what:'Grants and contributions the city gives to other bodies.',whatHi:'शहर द्वारा अन्य संस्थाओं को अनुदान।'},
 'nmam-270':{en:'Set aside for unpaid dues',hi:'बकाया के लिए अलग रखा',what:'Not money spent. An accounting provision for dues that may never be collected.',whatHi:'यह ख़र्च नहीं है। वसूल न हो सकने वाले बकाये के लिए प्रावधान।',bookkeeping:true},
 'nmam-271':{en:'Miscellaneous',hi:'विविध',what:'Small items that fit nowhere else.',whatHi:'छोटी मदें।'},
 'nmam-272':{en:'Wear and tear (depreciation)',hi:'टूट-फूट (मूल्यह्रास)',what:'Not money spent this year. An accounting estimate of how much roads, buildings and equipment wore out.',whatHi:'इस साल का ख़र्च नहीं। सड़कों, इमारतों और उपकरणों की टूट-फूट का हिसाबी अनुमान।',bookkeeping:true},
 'nmam-200':{en:'Other spending',hi:'अन्य ख़र्च',what:'Spending not classified elsewhere.',whatHi:'अन्य वर्गीकृत न किया गया ख़र्च।'},
 'programme':{en:'Events & programmes',hi:'कार्यक्रम',what:'Awards, training, health and cultural programmes.',whatHi:'पुरस्कार, प्रशिक्षण, स्वास्थ्य और सांस्कृतिक कार्यक्रम।'}
};
type Slice={record:MoneyRecord;rupees:number;color:string;bookkeeping:boolean};
/** ₹100 split exactly (largest remainder, always adding up to 100), in the fixed category order. */
function slices(rows:MoneyRecord[]):Slice[]{
 const order=orderCategories(rows.map(r=>({metric:r.metric,share:Number(BigInt(r.amountRupees))})));const sorted=order.map(m=>rows.find(r=>r.metric===m)!);
 const per100=sorted.length?apportion(100n,sorted.map(r=>BigInt(r.amountRupees))):[];
 return sorted.map((record,i)=>({record,rupees:Number(per100[i]),color:categoryColor(record.metric,spareColor(i)),bookkeeping:!!plain[record.metric]?.bookkeeping}));
}
const words=(m:string,r:MoneyRecord|undefined,hi:boolean)=>hi?(plain[m]?.hi??r?.labelHi??m):(plain[m]?.en??r?.label??m);
/**
 * 100 tiles that keep their identity. Switching view or year regroups them instead of redrawing, so people can see a
 * category grow or shrink. `data` null = 100 plain coins (the idea step).
 */
function Tiles({data,active,label}:{data:Slice[]|null;active:string|null;label:string}){
 const prev=useRef<(string|null)[]>(Array.from({length:TILES},()=>null));
 const usable=data&&data.reduce((a,s)=>a+s.rupees,0)===TILES?data:null;
 const {assigned,cells}=useMemo(()=>{if(!usable)return {assigned:Array.from({length:TILES},()=>null) as (string|null)[],cells:Array.from({length:TILES},(_,i)=>i)};
  const order=usable.map(s=>s.record.metric);const assigned=assignTiles(prev.current,new Map(usable.map(s=>[s.record.metric,s.rupees])),order);return {assigned:assigned as (string|null)[],cells:placeTiles(assigned,order)};},[usable]);
 useEffect(()=>{prev.current=assigned;},[assigned]);
 const by=new Map(usable?.map(s=>[s.record.metric,s])??[]);
 return <div className="tiles" role="img" aria-label={label}>{assigned.map((m,i)=>{const s=m?by.get(m):undefined;const c=cells[i];
  return <span key={i} aria-hidden="true" className={`tile ${s?'':'plain'} ${s?.bookkeeping?'bookkeeping':''} ${active&&m!==active?'faded':''}`}
   style={{left:`${(c%10)*10}%`,top:`${Math.floor(c/10)*10}%`,['--c' as string]:s?.color??'#dcae5c',transitionDelay:`${(c%10)*10+Math.floor(c/10)*5}ms`,animationDelay:`${i*8}ms`}}/>;})}</div>;
}
type History={year:string;records:MoneyRecord[]}[];
/** One tap on a category: what it is, how much, how it changed, and what is not known. */
function Explain({slice,hi,history,year,onSource}:{slice:Slice;hi:boolean;history?:History;year:string;onSource:(r:MoneyRecord)=>void}){
 const t=(a:string,b:string)=>hi?b:a;const r=slice.record;const p=plain[r.metric];
 const series=(history??[]).map(h=>({year:h.year,amount:BigInt(h.records.find(x=>x.metric===r.metric)?.amountRupees??'0')}));const max=series.reduce((m,x)=>x.amount>m?x.amount:m,1n);
 return <div className="story-explain" aria-live="polite">
  <strong>{words(r.metric,r,hi)}</strong>{(hi?p?.whatHi:p?.what)&&<p>{hi?p?.whatHi:p?.what}</p>}
  <dl className="explain-facts">
   <div><dt>{t('Out of ₹100','₹100 में से')}</dt><dd>{slice.rupees<1?t('under ₹1','₹1 से कम'):`₹${slice.rupees}`} <span className="link-tag calc">{t('Calculated','गणना')}</span></dd></div>
   <div><dt>{t('Amount','राशि')} · {year}</dt><dd>{formatMoney(r.amountRupees)} <span className="link-tag published">{t('Published','प्रकाशित')}</span></dd></div>
   <div><dt>{t('Who received it','किसे मिला')}</dt><dd>{t('Not public: no payment records name the recipients.','सार्वजनिक नहीं: भुगतान रिकॉर्ड में पाने वालों के नाम नहीं हैं।')} <span className="link-tag missing">{t('Missing link','कड़ी नहीं')}</span></dd></div>
  </dl>
  {series.length>1&&<figure className="explain-trend"><figcaption>{t('Year by year (same kind of figure: annual accounts)','साल-दर-साल (एक ही प्रकार का आंकड़ा: वार्षिक खाते)')}</figcaption>
   <div role="img" aria-label={series.map(x=>`${x.year}: ${x.amount?formatMoney(x.amount.toString()):t('none','शून्य')}`).join(', ')}>{series.map(x=><span key={x.year} className={x.year===year?'on':''} title={`${x.year}: ${formatMoney(x.amount.toString())}`}><i style={{height:`${Number(x.amount*100n/max)}%`}}/><small>{x.year.slice(2)}</small></span>)}</div></figure>}
  <button className="text-link" onClick={()=>onSource(r)}>{t('Exact figure & source','सटीक आंकड़ा और स्रोत')}<ArrowRight size={13}/></button>
 </div>;
}
function Legend({data,hi,active,picked,setActive,setHover}:{data:Slice[];hi:boolean;active:string|null;picked:string|null;setActive:(m:string|null)=>void;setHover:(m:string|null)=>void}){
 return <ul className="story-legend">{data.map(s=><li key={s.record.metric} className={active===s.record.metric?'on':''}>
  <button onClick={()=>setActive(picked===s.record.metric?null:s.record.metric)} onMouseEnter={()=>setHover(s.record.metric)} onMouseLeave={()=>setHover(null)} aria-pressed={picked===s.record.metric}>
   <i className={s.bookkeeping?'bookkeeping':''} style={{['--c' as string]:s.color,background:s.bookkeeping?undefined:s.color}}/><span>{words(s.record.metric,s.record,hi)}</span><strong>{s.rupees<1?(hi?'₹1 से कम':'under ₹1'):`₹${s.rupees}`}</strong></button></li>)}</ul>;
}
/** The biggest change in the ₹100 split since the previous year, plus warnings when the comparison needs care. */
function change(cur:Slice[],before:Slice[],prevYear:string,year:string,sameSource:boolean,hi:boolean){
 const t=(a:string,b:string)=>hi?b:a;const was=new Map(before.map(s=>[s.record.metric,s]));const now=new Map(cur.map(s=>[s.record.metric,s]));
 const metrics=[...new Set([...was.keys(),...now.keys()])];const d=(m:string)=>(now.get(m)?.rupees??0)-(was.get(m)?.rupees??0);
 const top=metrics.sort((a,b)=>Math.abs(d(b))-Math.abs(d(a))||categoryRank(a)-categoryRank(b))[0];const flags:string[]=[];
 if(!sameSource)flags.push(t(`${prevYear} comes from a different source, so categories may not match exactly.`,`${prevYear} का आंकड़ा दूसरे स्रोत से है, इसलिए श्रेणियां पूरी तरह मेल न खाएं।`));
 for(const m of metrics){const a=was.get(m)?.rupees??0,b=now.get(m)?.rupees??0;const r=now.get(m)?.record??was.get(m)?.record;
  if((a===0&&b>=3)||(b===0&&a>=3))flags.push(t(`“${words(m,r,false)}” ${b?`appears in ${year} but not in ${prevYear}`:`is in ${prevYear} but not in ${year}`}. This may be a change in how the accounts were grouped, not a real change.`,`“${words(m,r,true)}” ${b?`${year} में है पर ${prevYear} में नहीं`:`${prevYear} में है पर ${year} में नहीं`}। यह खातों के वर्गीकरण में बदलाव हो सकता है, असली बदलाव नहीं।`));}
 if(!top||d(top)===0)return {text:t(`Almost the same split as ${prevYear}.`,`${prevYear} जैसा ही बंटवारा।`),flags};
 const r=now.get(top)?.record??was.get(top)?.record;const a=was.get(top)?.rupees??0,b=now.get(top)?.rupees??0;
 return {text:t(`Compared with ${prevYear}: ${words(top,r,false)} ${b>a?'took':'got'} ₹${Math.abs(b-a)} ${b>a?'more':'less'} of every ₹100 (₹${a} → ₹${b}).`,`${prevYear} की तुलना में: ${words(top,r,true)} को हर ₹100 में ₹${Math.abs(b-a)} ${b>a?'ज़्यादा':'कम'} (₹${a} → ₹${b})।`),flags};
}
export type Previous={year:string;income:MoneyRecord[];expense:MoneyRecord[];sameSource:boolean};
export default function MoneyStory({income,expense,fiscalYear,hi,onSource,place='Pune',placeHi='पुणे',previous,history}:{income:MoneyRecord[];expense:MoneyRecord[];fiscalYear:string;hi:boolean;onSource:(r:MoneyRecord)=>void;place?:string;placeHi?:string;previous?:Previous;history?:History}){
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[picked,setPicked]=useState<string|null>(null),[hover,setHover]=useState<string|null>(null);
 // Hover previews a category; a tap or click selects it.
 const active=hover??picked;const t=(a:string,b:string)=>hi?b:a;
 useEffect(()=>{if(!playing)return;const id=setTimeout(()=>{if(step>=3)setPlaying(false);else setStep(step+1);},step===0?3500:6500);return()=>clearTimeout(id);},[playing,step]);
 useEffect(()=>{setPicked(null);setHover(null);},[step]);
 const steps=[t('The idea','समझें'),t('Came from','कहाँ से आया'),t('Went to','कहाँ गया'),t('What it built','क्या बना')];
 const inc=useMemo(()=>slices(income),[income]),exp=useMemo(()=>slices(expense),[expense]);
 const data=step===1?inc:step===2?exp:null;const shown=data?(data.find(s=>s.record.metric===active)??data[0]):null;
 const delta=previous&&data?change(data,slices(step===1?previous.income:previous.expense),previous.year,fiscalYear,previous.sameSource,hi):null;
 const go=(i:number)=>{setPlaying(false);setStep(i);};
 return <section className="story" aria-label={t('The city’s money, explained simply','शहर का पैसा, आसान भाषा में')}>
  <div className="story-top"><div className="story-tabs" role="tablist">{steps.map((s,i)=><button key={s} role="tab" aria-selected={step===i} className={step===i?'on':''} onClick={()=>go(i)}><span>{i+1}</span>{s}</button>)}</div>
   <button className="story-play" onClick={()=>{if(!playing&&step===3)setStep(0);setPlaying(!playing);}}>{playing?<Pause size={15}/>:<Play size={15}/>}{playing?t('Pause','रोकें'):t('Play the story','कहानी चलाएं')}</button></div>
  <div className="story-stage" role="tabpanel">
   {step===0&&<div className="story-intro"><h3>{t(`${place}’s city government collects money and spends it on the city. Here is ${fiscalYear}, shrunk to ₹100.`,`${placeHi} की नगर सरकार पैसा जुटाती है और शहर पर ख़र्च करती है। यहाँ ${fiscalYear} को ₹100 में समझिए।`)}</h3>
    <div className="story-path" aria-hidden="true"><span className="node"><Home size={24}/><small>{t('People, shops & the State','लोग, दुकानें और राज्य')}</small></span><span className="track"><i/><i/><i/></span><span className="node city"><Landmark size={26}/><small>{hi?'नगर निगम':'City'}</small></span><span className="track"><i/><i/><i/></span><span className="node"><Building2 size={24}/><small>{t('Staff, services & repairs','कर्मचारी, सेवाएं और मरम्मत')}</small></span></div></div>}
   {step===1&&<h3><Coins size={20}/>{t('Out of every ₹100 that came in…','हर ₹100 जो आया, उसमें से…')}</h3>}
   {step===2&&<h3><ReceiptText size={20}/>{t('Out of every ₹100 that went out…','हर ₹100 जो गया, उसमें से…')}</h3>}
   {step<3&&<div className={`waffle-wrap ${data?'':'idea'}`}>
    <Tiles data={data} active={active} label={data?`${step===1?t('Where ₹100 came from','₹100 कहाँ से आए'):t('Where ₹100 went','₹100 कहाँ गए')}: ${data.filter(s=>s.rupees>0).map(s=>`${words(s.record.metric,s.record,hi)} ₹${s.rupees}`).join(', ')}`:t('100 coins, each ₹1','100 सिक्के, हर एक ₹1')}/>
    {data&&shown?<><Legend data={data} hi={hi} active={active} picked={picked} setActive={setPicked} setHover={setHover}/><Explain slice={shown} hi={hi} history={history} year={fiscalYear} onSource={onSource}/></>
     :<p className="idea-note">{t('Each coin is ₹1 out of ₹100. Press “Came from” to see where they come from, then tap a colour to learn what it means.','हर सिक्का ₹100 में से ₹1 है। “कहाँ से आया” दबाएं, फिर किसी रंग पर टैप करके उसका अर्थ जानें।')}</p>}
   </div>}
   {delta&&<div className="story-change"><p>{delta.text}</p>{delta.flags.map(f=><p key={f} className="flag"><Info size={13}/>{f}</p>)}</div>}
   {step===2&&<p className="story-note"><i className="bookkeeping"/>{t('Striped coins are bookkeeping entries, not money actually spent.','धारीदार सिक्के हिसाब की प्रविष्टियाँ हैं, असली ख़र्च नहीं।')}</p>}
   {step===3&&<div className="story-built"><h3>{t('What did this money build?','इस पैसे से क्या बना?')}</h3><p>{t(`We don’t know yet. That needs public records of projects, tenders and contracts for ${place}, and none are connected yet. Paisa doesn’t guess.`,`अभी हमें नहीं पता। इसके लिए ${placeHi} की परियोजनाओं, निविदाओं और अनुबंधों के सार्वजनिक रिकॉर्ड चाहिए, जो अभी जुड़े नहीं हैं। पैसा अनुमान नहीं लगाता।`)}</p>
    <div className="built-chain">{[[Building2,t('Project','परियोजना')],[FileText,t('Tender','निविदा')],[ReceiptText,t('Contract','अनुबंध')],[Users,t('Contractor','ठेकेदार')]].map(([I,l],i)=>{const Icon=I as typeof Building2;return <span key={i}><Icon size={20}/>{l as string}<span className="link-tag missing">{t('Missing link','कड़ी नहीं')}</span></span>;})}</div>
    <p className="muted small">{t('When these are connected, this step will show each project, what it cost and who built it.','ये जुड़ने पर यहाँ हर परियोजना, उसकी लागत और किसने बनाया, दिखेगा।')}</p></div>}
  </div>
  <div className="story-nav"><button disabled={step===0} onClick={()=>go(step-1)}><ChevronLeft size={16}/>{t('Back','पीछे')}</button><span className="muted small"><Info size={13}/>{t('Annual accounts, rounded to whole rupees out of ₹100.','वार्षिक खाते, ₹100 में पूरे रुपयों तक गोल।')}</span><button disabled={step===3} onClick={()=>go(step+1)}>{t('Next','आगे')}<ChevronRight size={16}/></button></div>
 </section>;
}
