import type {ShareRecord} from '../../../packages/schema/index';
/** Plain names and the per-₹100 view of a state's finances (RBI ratios to GSDP). Shared by the map and the state pages. */
export const shareLabels:Record<string,{en:string;hi:string;what:string;whatHi:string}>={
 'own-tax':{en:'State’s own taxes',hi:'राज्य के अपने कर',what:'Taxes the state collects itself, such as its share of GST, stamp duty, vehicle tax and excise.',whatHi:'राज्य द्वारा स्वयं वसूले कर, जैसे जीएसटी का राज्य हिस्सा, स्टांप शुल्क, वाहन कर और उत्पाद शुल्क।'},
 'own-non-tax':{en:'Fees, royalties & other income',hi:'शुल्क, रॉयल्टी और अन्य आय',what:'Mining royalties, fees, interest and dividends earned by the state.',whatHi:'खनन रॉयल्टी, शुल्क, ब्याज और लाभांश।'},
 'union-transfers':{en:'Money from the Union',hi:'केंद्र से पैसा',what:'The state’s share of central taxes plus grants from the Government of India.',whatHi:'केंद्रीय करों में राज्य का हिस्सा और भारत सरकार के अनुदान।'},
 'development':{en:'Development',hi:'विकास',what:'Education, health, agriculture, rural and urban development, welfare and similar services.',whatHi:'शिक्षा, स्वास्थ्य, कृषि, ग्रामीण और शहरी विकास, कल्याण जैसी सेवाएं।'},
 'interest':{en:'Interest on loans',hi:'कर्ज़ पर ब्याज',what:'Interest the state pays on money it borrowed earlier.',whatHi:'पहले लिए कर्ज़ पर राज्य द्वारा दिया गया ब्याज।'},
 'pension':{en:'Pensions',hi:'पेंशन',what:'Pensions paid to retired state government employees.',whatHi:'सेवानिवृत्त राज्य कर्मचारियों को पेंशन।'},
 'administration':{en:'Administration & other non-development',hi:'प्रशासन और अन्य गैर-विकास',what:'Non-development spending other than interest and pensions, such as administration, police and tax collection.',whatHi:'ब्याज और पेंशन के अलावा गैर-विकास ख़र्च, जैसे प्रशासन, पुलिस और कर वसूली।'},
 'other':{en:'Other spending',hi:'अन्य ख़र्च',what:'Revenue spending that RBI does not classify as development or non-development.',whatHi:'राजस्व ख़र्च जिसे RBI विकास या गैर-विकास में नहीं गिनता।'}
};
export const periodKind=(k:string,hi:boolean)=>k==='ACTUAL'?(hi?'वास्तविक (लेखा)':'actual accounts'):k==='RE'?(hi?'संशोधित अनुमान':'revised estimate'):(hi?'बजट योजना':'budget plan');
export type ShareItem={key:string;weight:bigint;records:ShareRecord[]};
/** Per-₹100 view from RBI ratios (all % of GSDP, so shares are ratios of ratios). Prefers RE over BE for the same year. */
export function shareView(shares:ShareRecord[],year:string){
 const kind=(['ACTUAL','RE','BE'] as const).find(k=>shares.some(r=>r.fiscalYear===year&&r.valueType===k));if(!kind)return null;
 const rows=shares.filter(r=>r.fiscalYear===year&&r.valueType===kind);const g=(m:string)=>rows.find(r=>r.metric===m);const n=(m:string)=>BigInt(g(m)?.tenthsOfPercentGsdp??0);
 const pos=(x:bigint)=>x>0n?x:0n;const rr=g('revenue-receipts');if(!rr)return null;
 return {kind,size:(rr.tenthsOfPercentGsdp/10).toFixed(1),rows,
  income:[['own-tax'],['own-non-tax'],['union-transfers']].map(([m])=>({key:m,weight:n(m),records:[g(m)!]})) as ShareItem[],
  spend:[{key:'development',weight:n('development'),records:[g('development')!]},{key:'administration',weight:pos(n('non-development')-n('interest')-n('pension')),records:[g('non-development')!,g('interest')!,g('pension')!]},{key:'interest',weight:n('interest'),records:[g('interest')!]},{key:'pension',weight:n('pension'),records:[g('pension')!]},{key:'other',weight:pos(n('revenue-expenditure')-n('development')-n('non-development')),records:[g('revenue-expenditure')!,g('development')!,g('non-development')!]}].filter(x=>x.weight>0n) as ShareItem[]};
}
