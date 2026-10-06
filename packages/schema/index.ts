import { z } from 'zod';
export const valueTypes = ['BE','RE','ACTUAL','RELEASE','TENDER_VALUE','AWARDED_VALUE','PAYMENT','SANCTIONED'] as const;
export const MoneyRecordSchema = z.object({
 id:z.string(), metric:z.string(), label:z.string(), labelHi:z.string(), group:z.enum(['overview','revenue','expenditure','scheme','municipal-income','municipal-expenditure']),
 fiscalYear:z.string().regex(/^\d{4}-\d{2}$/), valueType:z.enum(valueTypes), amountRupees:z.string().regex(/^\d+$/),
 sourceId:z.string(), snapshotHash:z.string().regex(/^[a-f0-9]{64}$/), sourcePage:z.number().int().positive(), rawValue:z.string(), rawUnit:z.enum(['crore','rupee']), geographyId:z.string().optional(),
 parserVersion:z.string(), retrievedAt:z.string(), status:z.literal('PUBLISHED'), period:z.string(), notes:z.string().default('')
});
export type MoneyRecord=z.infer<typeof MoneyRecordSchema>;
/** A published ratio (not money): a component as tenths of a per cent of GSDP, e.g. 78 = 7.8% of GSDP. */
export const ShareRecordSchema=z.object({
 id:z.string(), geographyId:z.string(), statement:z.enum(['33','34']), metric:z.string(), fiscalYear:z.string().regex(/^\d{4}-\d{2}$/), valueType:z.enum(['ACTUAL','BE','RE']),
 tenthsOfPercentGsdp:z.number().int().min(0).max(1000), rawValue:z.string(), cell:z.string().regex(/^[A-Z]+\d+$/), sourceId:z.string(), snapshotHash:z.string().regex(/^[a-f0-9]{64}$/),
 parserVersion:z.string(), retrievedAt:z.string(), status:z.literal('PUBLISHED'), period:z.string()
});
export type ShareRecord=z.infer<typeof ShareRecordSchema>;
/** One published contract award. Money is integer paise as a decimal string. "valueCheck" says whether the award passed the estimate check used for totals. */
export const ContractSchema=z.object({
 id:z.string(), ocid:z.string(), tenderId:z.string(), title:z.string(), buyer:z.string(), location:z.string().nullable(), category:z.string().nullable(), method:z.string().nullable(),
 tenderPublished:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), estimatePaise:z.string().regex(/^\d+$/).nullable(), awardPaise:z.string().regex(/^\d+$/), rawAward:z.string(),
 bidders:z.number().int().nonnegative().nullable(), contractorId:z.string(), contractorName:z.string(), valueCheck:z.enum(['plausible','unchecked','implausible']),
 geographyId:z.string(), sourceId:z.string()
});
export type Contract=z.infer<typeof ContractSchema>;
/** One ongoing central project (₹150 crore+) from MoSPI's monthly Flash Report. Months are YYYY-MM; money is integer rupees as decimal strings. */
export const ProjectSchema=z.object({
 id:z.string(), code:z.string(), ocmsCode:z.string().nullable(), pmgId:z.string().nullable(), serial:z.number().int().positive(), name:z.string().min(1), agency:z.string().nullable(), ministry:z.string(), sector:z.string(),
 stateLabel:z.string(), geographyIds:z.array(z.string()), approved:z.string().nullable(), started:z.string().nullable(), originalCompletion:z.string().nullable(), revisedCompletion:z.string().nullable(), delayMonths:z.number().int().nullable(),
 originalRupees:z.string().regex(/^\d+$/), latestRupees:z.string().regex(/^\d+$/), expenditureRupees:z.string().regex(/^\d+$/).nullable(), physicalProgress:z.string().nullable(), rawRow:z.string(), reportMonth:z.string(), sourceId:z.string()
});
export type Project=z.infer<typeof ProjectSchema>;
export type ProjectsFile={status:'PUBLISHED';publishedAt:string;source:Source;reportMonth:string;parserVersion:string;projects:Project[];validations:{rule:string;passed:boolean;differenceRupees:string;toleranceRupees:string}[]};
export type Contractor={id:string;name:string;aliases:string[];contracts:number;checkedContracts:number;checkedTotalPaise:string;buyers:{name:string;contracts:number}[];years:string[];singleBidWins:number};
export type ContractsFile={status:'PUBLISHED';publishedAt:string;source:Source;snapshotHash:string;parserVersion:string;contracts:Contract[];contractors:Contractor[];excluded:{reason:string;count:number}[];validations:{rule:string;passed:boolean;differenceRupees:string;toleranceRupees:string}[]};
export type Source={id:string;url:string;sha256:string;path:string;retrievedAt:string;httpMetadata:Record<string,string>;datasetVersion:string;parserVersion:string;license:{name:string;url:string;redistributionAllowed:boolean;attribution:string};authority?:string;title?:string;retrieval?:string};
export type Dataset={status:'PUBLISHED';publishedAt:string;records:MoneyRecord[];shares?:ShareRecord[];sharesBySource?:Record<string,number>;citiesSummary?:{sourceId:string;cities:number;withData:number;cityYears:number;years:string[];byState:Record<string,number>};projectsSummary?:{sourceId:string;reportMonth:string;projects:number;delayed:number;overCost:number;originalRupees:string;latestRupees:string;expenditureRupees:string;byState:Record<string,{projects:number;delayed:number;overCost:number}>};contractsSummary?:{sourceId:string;geographyId:string;awards:number;contractors:number;buyers:number;checkedTotalPaise:string;singleBid:number;years:string[]};sources:Source[];validations:{rule:string;passed:boolean;differenceRupees:string;toleranceRupees:string}[]};
export const QuerySchema=z.discriminatedUnion('intent',[
 z.object({intent:z.literal('overview')}),
 z.object({intent:z.literal('lookup'),metric:z.enum(['gst','food','education','health','transport','total-expenditure','revenue-receipts']),fiscalYear:z.enum(['2024-25','2025-26','2026-27']),valueType:z.enum(['BE','RE','ACTUAL'])}),
 z.object({intent:z.literal('municipal'),geography:z.literal('pmc'),fiscalYear:z.literal('2024-25')}),
 z.object({intent:z.literal('unavailable')})
]);
export type PaisaQuery=z.infer<typeof QuerySchema>;
export interface QueryProvider { interpret(question:string):Promise<PaisaQuery>; }
export type GeographyType='country'|'state'|'ut'|'district'|'urban'|'rural'|'ulb'|'ward'|'block'|'gram_panchayat'|'village'|'project';
export type Geography={id:string;name:string;nameHi:string;type:GeographyType;parentId:string|null;officialCode:string|null;codeSystem:string|null};
export const geographies:Geography[]=[
 {id:'india',name:'India',nameHi:'भारत',type:'country',parentId:null,officialCode:'IN',codeSystem:'ISO 3166-1'},
 {id:'andaman-nicobar',name:'Andaman and Nicobar Islands',nameHi:'अंडमान और निकोबार द्वीपसमूह',type:'ut',parentId:'india',officialCode:null,codeSystem:null},
 {id:'andhra-pradesh',name:'Andhra Pradesh',nameHi:'आंध्र प्रदेश',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'arunachal-pradesh',name:'Arunachal Pradesh',nameHi:'अरुणाचल प्रदेश',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'assam',name:'Assam',nameHi:'असम',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'bihar',name:'Bihar',nameHi:'बिहार',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'chandigarh',name:'Chandigarh',nameHi:'चंडीगढ़',type:'ut',parentId:'india',officialCode:null,codeSystem:null},
 {id:'chhattisgarh',name:'Chhattisgarh',nameHi:'छत्तीसगढ़',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'dnh-dd',name:'Dadra and Nagar Haveli and Daman and Diu',nameHi:'दादरा और नगर हवेली और दमन और दीव',type:'ut',parentId:'india',officialCode:null,codeSystem:null},
 {id:'delhi',name:'Delhi',nameHi:'दिल्ली',type:'ut',parentId:'india',officialCode:null,codeSystem:null},
 {id:'goa',name:'Goa',nameHi:'गोवा',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'gujarat',name:'Gujarat',nameHi:'गुजरात',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'haryana',name:'Haryana',nameHi:'हरियाणा',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'himachal-pradesh',name:'Himachal Pradesh',nameHi:'हिमाचल प्रदेश',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'jammu-kashmir',name:'Jammu and Kashmir',nameHi:'जम्मू और कश्मीर',type:'ut',parentId:'india',officialCode:null,codeSystem:null},
 {id:'jharkhand',name:'Jharkhand',nameHi:'झारखंड',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'karnataka',name:'Karnataka',nameHi:'कर्नाटक',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'kerala',name:'Kerala',nameHi:'केरल',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'ladakh',name:'Ladakh',nameHi:'लद्दाख',type:'ut',parentId:'india',officialCode:null,codeSystem:null},
 {id:'lakshadweep',name:'Lakshadweep',nameHi:'लक्षद्वीप',type:'ut',parentId:'india',officialCode:null,codeSystem:null},
 {id:'madhya-pradesh',name:'Madhya Pradesh',nameHi:'मध्य प्रदेश',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'maharashtra',name:'Maharashtra',nameHi:'महाराष्ट्र',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'manipur',name:'Manipur',nameHi:'मणिपुर',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'meghalaya',name:'Meghalaya',nameHi:'मेघालय',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'mizoram',name:'Mizoram',nameHi:'मिज़ोरम',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'nagaland',name:'Nagaland',nameHi:'नागालैंड',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'odisha',name:'Odisha',nameHi:'ओडिशा',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'puducherry',name:'Puducherry',nameHi:'पुडुचेरी',type:'ut',parentId:'india',officialCode:null,codeSystem:null},
 {id:'punjab',name:'Punjab',nameHi:'पंजाब',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'rajasthan',name:'Rajasthan',nameHi:'राजस्थान',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'sikkim',name:'Sikkim',nameHi:'सिक्किम',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'tamil-nadu',name:'Tamil Nadu',nameHi:'तमिलनाडु',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'telangana',name:'Telangana',nameHi:'तेलंगाना',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'tripura',name:'Tripura',nameHi:'त्रिपुरा',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'uttar-pradesh',name:'Uttar Pradesh',nameHi:'उत्तर प्रदेश',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'uttarakhand',name:'Uttarakhand',nameHi:'उत्तराखंड',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'west-bengal',name:'West Bengal',nameHi:'पश्चिम बंगाल',type:'state',parentId:'india',officialCode:null,codeSystem:null},
 {id:'pune',name:'Pune',nameHi:'पुणे',type:'district',parentId:'maharashtra',officialCode:null,codeSystem:null},
 {id:'pune-urban',name:'Urban',nameHi:'शहरी',type:'urban',parentId:'pune',officialCode:null,codeSystem:null},
 {id:'pune-rural',name:'Rural',nameHi:'ग्रामीण',type:'rural',parentId:'pune',officialCode:null,codeSystem:null},
 {id:'pmc',name:'Pune Municipal Corporation',nameHi:'पुणे महानगरपालिका',type:'ulb',parentId:'pune-urban',officialCode:null,codeSystem:null}
];
export const SIGNAL_DISCLAIMER='Automated signal generated from public data. This does not establish wrongdoing, waste or corruption.';
export const TAX_DISCLAIMER='This is an illustrative proportional representation of government expenditure. Individual tax payments are pooled and cannot generally be traced to a specific project or expenditure.';
export const NO_DATA='Paisa does not currently have authoritative public data for this question.';
