import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import type {MoneyRecord,Source} from '../../packages/schema/index';
import {reviewedStatements} from './reviewed-statement';
export const parserVersion='pmc-accounts/1.0.0';
/** Pinned official artifact. pmc.gov.in renders document lists client-side, so new years are added here after review. */
export const PMC_ARTIFACT={id:'pmc-afs-2024-25',fiscalYear:'2024-25',url:'https://adc-ecos.enlightcloud.com/1133pmcwebsitev2/s3fs-public/2025-12/Financial-Statements-2024-25.pdf?VersionId=f4cf885d-819e-4bdf-ae64-72639ff4eec7'};
type Spec=[metric:string,schedule:string,label:string,labelEn:string,labelHi:string,group:'municipal-income'|'municipal-expenditure',note:string];
const ACCRUAL='Audited, accrual basis: income recognised when due, not only cash collected.';
// Schedule grand-total rows. The face Income & Expenditure statement is a scanned image; these text-layer schedule totals feed it.
export const specs:Spec[]=[
 ['property-water-tax','IN1','Total Property Tax & Water Tax','Property tax & water tax','संपत्ति कर और जल कर','municipal-income',`${ACCRUAL} Includes change in tax receivables; see provision for overdues (EX-9).`],
 ['lbt-gst','IN2','Total : Local Body Tax/GST','Local Body Tax / GST compensation','स्थानीय निकाय कर / जीएसटी क्षतिपूर्ति','municipal-income','Mainly the State Government grant under GST in lieu of Local Body Tax, plus stamp-duty surcharge.'],
 ['rental-income','IN3','Total :Rental Income From Municipal Properties','Rent from municipal properties','नगर संपत्तियों से किराया','municipal-income',ACCRUAL],
 ['fees-user-charges','IN4','Total : Fees &User Charges','Fees & user charges','शुल्क और उपयोगकर्ता प्रभार','municipal-income','Includes building-permission and development charges. '+ACCRUAL],
 ['sales-hire','IN5','Total : Sales & Hire Charges','Sales & hire charges','बिक्री और किराया प्रभार','municipal-income',ACCRUAL],
 ['revenue-grants','IN6','Total : Revenue Grants,Contribution &Subsidies','Revenue grants, contributions & subsidies','राजस्व अनुदान, अंशदान और सब्सिडी','municipal-income','Revenue grants from Central/State schemes recognised as income. Capital grants are not included.'],
 ['interest-earned','IN7','Total : Interest Earned','Interest earned','अर्जित ब्याज','municipal-income',ACCRUAL],
 ['other-income','IN8','Total : Other Income','Other income','अन्य आय','municipal-income',ACCRUAL],
 ['other-taxes','IN9','Total : Other Taxes','Other taxes','अन्य कर','municipal-income','Entertainment tax share.'],
 ['establishment','EX1','Total : Establishment Expenditures','Salaries, pensions & benefits','वेतन, पेंशन और लाभ','municipal-expenditure','Establishment expenses: salaries, allowances, pension and retirement benefits.'],
 ['administrative','EX2','Total : Administrative Expenditures','Administrative expenses','प्रशासनिक व्यय','municipal-expenditure',''],
 ['operations-maintenance','EX3','Total : Operation & Maintenance Expenses','Operations & maintenance','संचालन और रखरखाव','municipal-expenditure','Includes power, water supply operations, sanitation and contract manpower.'],
 ['repairs-assets','EX4','Total : Repairs & Maintenance Expenses of Assets','Repairs & maintenance of assets','परिसंपत्तियों की मरम्मत और रखरखाव','municipal-expenditure','Revenue expenditure on existing assets. New capital works are not included.'],
 ['interest-finance','EX5','Total : Interest & Finance Expenses','Interest & finance charges','ब्याज और वित्त प्रभार','municipal-expenditure',''],
 ['programme','EX6','Total : Program Expenses','Programme expenses','कार्यक्रम व्यय','municipal-expenditure',''],
 ['grants-subsidies','EX7','Total : Revenue, Grants, Contributions & Subsidies','Grants, contributions & subsidies paid','दिए गए अनुदान, अंशदान और सब्सिडी','municipal-expenditure','Includes contributions to other public bodies.'],
 ['miscellaneous','EX8','Total : Miscellaneous Expenses','Miscellaneous expenses','विविध व्यय','municipal-expenditure',''],
 ['provision-overdues','EX9','Total : Provision for overdues property tax & rent receivable','Provision for overdue taxes & rent','बकाया कर और किराये हेतु प्रावधान','municipal-expenditure','Accounting provision against receivables more than three/five years overdue. Not a cash payment.']
];
const norm=(s:string)=>s.replace(/\s+/g,'').toLowerCase();
const numeric=/^(\(?[\d,]+(\.\d+)?\)?|-)$/;
export type Row={page:number;cells:string[]};
/** Rebuild visual rows from text positions; items within 4pt vertically share a row. */
export async function extractRows(raw:Uint8Array){
 const doc=await getDocument({data:raw,verbosity:0}).promise;const pages:{text:string;rows:Row[]}[]=[];
 for(let p=1;p<=doc.numPages;p++){
  const items=(await(await doc.getPage(p)).getTextContent()).items.flatMap(it=>'str'in it&&it.str.trim()?[{x:it.transform[4],y:it.transform[5],s:it.str.trim()}]:[]);
  const groups:{y:number;items:typeof items}[]=[];
  for(const it of items){const g=groups.find(g=>Math.abs(g.y-it.y)<=4);if(g)g.items.push(it);else groups.push({y:it.y,items:[it]});}
  pages.push({text:items.map(i=>i.s).join(' '),rows:groups.sort((a,b)=>b.y-a.y).map(g=>({page:p,cells:g.items.sort((a,b)=>a.x-b.x).map(i=>i.s)}))});
 }
 return pages;
}
export function toRupees(cell:string){
 if(cell==='-')return 0n;if(!/^\(?\d{1,3}(,\d{2})*(,\d{3})?\)?$/.test(cell))throw new Error(`Non-integer or malformed amount: ${cell}`);
 const v=BigInt(cell.replace(/[(),]/g,''));return cell.startsWith('(')?-v:v;
}
/** Find exactly one schedule total row on a page footed by the expected schedule code. Missing or ambiguous rows fail closed. */
export function parseRows(pages:{text:string;rows:Row[]}[],source:Source,fiscalYear:string):MoneyRecord[]{
 const fy=`${fiscalYear.slice(0,4)}-20${fiscalYear.slice(5)}`;
 if(!pages.some(p=>p.text.includes('Pune Municipal Corporation')&&p.text.includes(`For the year ${fy}`)))throw new Error('Unexpected PMC fiscal year/schema');
 return specs.map(([metric,schedule,label,labelEn,labelHi,group,notes])=>{
  const matches=pages.flatMap(p=>p.rows.some(r=>r.cells.some(c=>norm(c).replace(/-/g,'')===norm(schedule)))?p.rows.flatMap((row,i)=>{
   const text=norm(row.cells.filter(c=>!numeric.test(c)).join(''));let amounts=row.cells.filter(c=>numeric.test(c));
   // A label may wrap around its amount row: "Total Property Tax &" / amounts / "Water Tax".
   if(text!==norm(label)){const next=p.rows[i+1]?.cells??[];if(amounts.length||!next.every(c=>numeric.test(c))||text+norm(p.rows[i+2]?.cells.join('')??'')!==norm(label))return [];amounts=next;}
   return amounts.length===3?[{page:row.page,amounts}]:[];
  }):[]);
  if(matches.length!==1)throw new Error(`PMC schedule ${schedule} total: expected 1 row, found ${matches.length}`);
  const [{page,amounts}]=matches;const value=toRupees(amounts[2]);if(value<0n)throw new Error(`Negative schedule total ${schedule}`);
  return {id:`${source.id}:${metric}:${fiscalYear}:ACTUAL`,metric,label:labelEn,labelHi,group,fiscalYear,valueType:'ACTUAL' as const,amountRupees:value.toString(),sourceId:source.id,snapshotHash:source.sha256,sourcePage:page,rawValue:amounts[2],rawUnit:'rupee' as const,geographyId:'pmc',parserVersion,retrievedAt:source.retrievedAt,status:'PUBLISHED' as const,period:`Full fiscal year ${fiscalYear} (audited, accrual basis) · Schedule ${schedule.replace(/(\D+)/,'$1-')}`,notes};
 });
}
/** Every parsed total must equal the reviewed statement line exactly; the reviewed statement must itself add up. */
export function validatePmc(records:MoneyRecord[],fiscalYear:string){
 const ref=reviewedStatements[fiscalYear];if(!ref)throw new Error(`No reviewed PMC statement reference for ${fiscalYear}`);
 const checks:{rule:string;passed:boolean;differenceRupees:string;toleranceRupees:string}[]=[];
 const compare=(rule:string,actual:bigint,expected:bigint,tolerance=0n)=>{const diff=actual-expected;checks.push({rule:`PMC ${fiscalYear}: ${rule}`,passed:(diff<0n?-diff:diff)<=tolerance,differenceRupees:diff.toString(),toleranceRupees:tolerance.toString()});};
 for(const [schedule,expected] of Object.entries(ref.lines)){const spec=specs.find(s=>s[1]===schedule);if(!spec)continue;const r=records.find(r=>r.metric===spec[0]);if(!r)throw new Error(`Missing PMC ${schedule}`);compare(`Schedule ${schedule} = audited statement line`,BigInt(r.amountRupees),BigInt(expected));}
 const sum=(keys:string[])=>keys.reduce((a,k)=>a+BigInt(ref.lines[k]),0n);
 const income=Object.keys(ref.lines).filter(k=>k.startsWith('IN')||k==='REVALUATION'),expense=Object.keys(ref.lines).filter(k=>k.startsWith('EX')||k==='DEPRECIATION');
 compare('Income lines = statement total income',sum(income),BigInt(ref.totalIncome));
 compare('Expense lines = statement total expenses (printed rounding)',sum(expense),BigInt(ref.totalExpenses),10n);
 compare('Total income − total expenses = surplus',BigInt(ref.totalIncome)-BigInt(ref.totalExpenses),BigInt(ref.surplus),10n);
 if(checks.some(c=>!c.passed))throw new Error('PMC reconciliation failed: '+JSON.stringify(checks.filter(c=>!c.passed)));
 return checks;
}
export async function parsePmcPdf(raw:Uint8Array,source:Source,fiscalYear=PMC_ARTIFACT.fiscalYear){return parseRows(await extractRows(raw),source,fiscalYear);}
