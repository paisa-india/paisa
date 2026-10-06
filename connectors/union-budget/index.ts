import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import type {MoneyRecord,Source} from '../../packages/schema/index';
export const parserVersion='union-budget/1.0.0';
const columns=[['2024-25','ACTUAL'],['2025-26','BE'],['2025-26','RE'],['2026-27','BE']] as const;
type Spec=[string,string,string,string];
const specs:Record<string,{page:number;group:MoneyRecord['group'];rows:Spec[]}>={
 bag1:{page:3,group:'overview',rows:[
 ['revenue-receipts','Revenue Receipts','Revenue receipts','राजस्व प्राप्तियां'],['net-tax','Tax Revenue \\(Net to Centre\\) 1','Net tax revenue','केंद्र का निवल कर राजस्व'],['non-tax','Non Tax Revenue','Non-tax revenue','गैर-कर राजस्व'],['loan-recovery','Recovery of Loans','Loan recovery','ऋण वसूली'],['other-receipts','Other Receipts','Other non-debt receipts','अन्य ऋण-भिन्न प्राप्तियां'],['borrowing','Borrowings and Other Liabilities 2','Borrowing & other liabilities','उधार और अन्य देयताएं'],['total-expenditure','Total Expenditure \\(10\\+13\\)','Total expenditure','कुल व्यय'],['revenue-expenditure','On Revenue Account','Revenue expenditure','राजस्व व्यय'],['capital-expenditure','On Capital Account','Capital expenditure','पूंजीगत व्यय']]},
 bag5:{page:1,group:'revenue',rows:[
 ['corporation-tax','Corporation Tax','Corporation tax','निगम कर'],['income-tax','Taxes on Income','Taxes on income (includes STT)','आय पर कर (STT सहित)'],['customs','Customs','Customs','सीमा शुल्क'],['excise','Union Excise Duties','Union excise duties','केंद्रीय उत्पाद शुल्क'],['gst','e\\. GST','GST (Union receipts)','जीएसटी (केंद्रीय प्राप्तियां)'],['ut-taxes','Taxes of Union Territories','Taxes of Union Territories','केंद्र शासित प्रदेशों के कर'],['other-taxes','Other Taxes','Other taxes','अन्य कर'],['dividends','Dividends and Profits','Dividends and profits','लाभांश और लाभ'],['interest-receipts','Interest receipts','Interest receipts','ब्याज प्राप्तियां']]},
 bag6:{page:4,group:'expenditure',rows:[
 ['pension','Pension','Pensions','पेंशन'],['defence','Defence','Defence','रक्षा'],['fertiliser','Fertiliser','Fertiliser subsidy','उर्वरक सब्सिडी'],['food','Food','Food subsidy','खाद्य सब्सिडी'],['petroleum','Petroleum','Petroleum subsidy','पेट्रोलियम सब्सिडी'],['agriculture','Agriculture and Allied Activities 1','Agriculture & allied activities','कृषि और संबद्ध गतिविधियां'],['commerce','Commerce and Industry','Commerce & industry','वाणिज्य और उद्योग'],['north-east','Development of North East','Development of North East','पूर्वोत्तर विकास'],['education','Education','Education','शिक्षा'],['energy','Energy 2','Energy','ऊर्जा'],['external-affairs','External Affairs','External affairs','विदेश मामले'],['finance','Finance','Finance','वित्त'],['health','Health','Health','स्वास्थ्य'],['home-affairs','Home Affairs \\(including Union Territories\\)','Home affairs','गृह मामले'],['interest','Interest','Interest payments','ब्याज भुगतान'],['it-telecom','IT and Telecom 3','IT & telecom','सूचना प्रौद्योगिकी और दूरसंचार'],['rural','Rural Development 4','Rural development','ग्रामीण विकास'],['science','Scientific Departments','Scientific departments','वैज्ञानिक विभाग'],['social-welfare','Social Welfare','Social welfare','सामाजिक कल्याण'],['tax-admin','Tax Administration 5','Tax administration','कर प्रशासन'],['transport','Transport','Transport','परिवहन'],['urban','Urban Development','Urban development','शहरी विकास'],['others','Others','Other expenditure','अन्य व्यय']]},
 bag7:{page:1,group:'scheme',rows:[['samagra','Samagra Shiksha','Samagra Shiksha','समग्र शिक्षा'],['pm-shri','PM Schools for Rising India \\(PM SHRI\\)','PM SHRI Schools','पीएम श्री विद्यालय'],['pmjay','Ayushman Bharat - Pradhan Mantri Jan Arogya Yojana \\(PMJAY\\)','Ayushman Bharat – PMJAY','आयुष्मान भारत – पीएमजेएवाई'],['pmay-urban','PMAY-Urban','PMAY – Urban','प्रधानमंत्री आवास योजना – शहरी'],['amrut','AMRUT \\(Atal Mission for Rejuvenation and Urban Transformation\\)','AMRUT','अमृत']]}
};
/** Parse four ordered fiscal columns. Missing rows/years fail closed. */
export function parsePages(pages:string[],source:Source):MoneyRecord[]{
 const spec=specs[source.id];if(!spec)throw new Error('Unsupported artifact');
 const text=pages[spec.page-1]?.replace(/\s+/g,' ');if(!text?.includes('2026-2027')&&!text?.includes('2026-27'))throw new Error('Unexpected fiscal year/schema');
 return spec.rows.flatMap(([metric,pattern,label,labelHi])=>{
 const match=new RegExp(pattern+'\\s+(\\d{3,})\\s+(\\d{3,})\\s+(\\d{3,})\\s+(\\d{3,})(?:\\s|$)').exec(text);
 if(!match)throw new Error(`Missing row or fiscal columns ${metric}`);
 return columns.map(([fiscalYear,valueType],i)=>({id:`${source.id}:${metric}:${fiscalYear}:${valueType}`,metric,label,labelHi,group:spec.group,fiscalYear,valueType,amountRupees:(BigInt(match[i+1])*10000000n).toString(),sourceId:source.id,snapshotHash:source.sha256,sourcePage:spec.page,rawValue:match[i+1],rawUnit:'crore' as const,parserVersion,retrievedAt:source.retrievedAt,status:'PUBLISHED' as const,period:`Full fiscal year ${fiscalYear}`,notes:metric==='gst'?'Union budget receipts, not all-India gross GST collections.':metric==='borrowing'?'Financing, not tax revenue; includes drawdown of cash balance.':metric==='income-tax'?'Includes securities transaction tax; do not add STT again.':spec.group==='expenditure'?'Official major-item classification. Figures may differ from ministry totals. See source footnotes.':''}));
 });
}
export async function parsePdf(raw:Uint8Array,source:Source){
 const doc=await getDocument({data:raw,useSystemFonts:true}).promise;const pages=[];
 for(let i=1;i<=doc.numPages;i++){const content=await(await doc.getPage(i)).getTextContent();pages.push(content.items.map(item=>'str'in item?item.str:'').join(' '));}
 return parsePages(pages,source);
}
