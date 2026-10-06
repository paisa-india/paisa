import {NO_DATA,QuerySchema,type PaisaQuery,type Dataset,type QueryProvider} from '../../packages/schema/index';
import {formatMoney} from '../../packages/calculations/index';
/** Deterministic fallback; a future LLM adapter must return exactly QuerySchema, never SQL. */
export const localProvider:QueryProvider={async interpret(question){
 const q=question.toLowerCase();if(q.length>500||/select |insert |delete |drop |update |;/.test(q))return {intent:'unavailable'};
 const year=q.match(/20\d{2}-\d{2}/)?.[0];if(year&&!['2024-25','2025-26','2026-27'].includes(year))return {intent:'unavailable'};
 if(/project|contract|tender|ward|maharashtra|परियोजना/.test(q))return {intent:'unavailable'};
 if(/pune|pmc|पुणे/.test(q))return year&&year!=='2024-25'?{intent:'unavailable'}:{intent:'municipal',geography:'pmc',fiscalYear:'2024-25'};
 const map=[[/gst|जीएसटी/,'gst'],[/food|खाद्य/,'food'],[/education|शिक्षा/,'education'],[/health|स्वास्थ्य/,'health'],[/transport|परिवहन/,'transport'],[/expenditure|spend|व्यय/,'total-expenditure'],[/revenue|receipts|राजस्व/,'revenue-receipts']] as const;
 const metric=map.find(([r])=>r.test(q))?.[1];if(!metric)return {intent:'unavailable'};
 const actual=/collect|received|actual|so far|वास्तविक/.test(q);const fiscalYear=year??'2026-27';
 return QuerySchema.parse({intent:'lookup',metric,fiscalYear,valueType:actual?'ACTUAL':/revised/.test(q)?'RE':'BE'});
}};
export function executeQuery(raw:PaisaQuery,data:Dataset){const q=QuerySchema.parse(raw);if(q.intent==='unavailable')return {answer:NO_DATA,records:[]};if(q.intent==='municipal'){const records=data.records.filter(r=>r.geographyId===q.geography&&r.fiscalYear===q.fiscalYear);if(!records.length)return {answer:NO_DATA,records:[]};const sum=(g:string)=>records.filter(r=>r.group===g).reduce((a,r)=>a+BigInt(r.amountRupees),0n).toString();return {answer:`Pune Municipal Corporation, audited accounts ${q.fiscalYear} (accrual basis): revenue income in schedules IN-1 to IN-9 ${formatMoney(sum('municipal-income'))}; revenue expenditure in schedules EX-1 to EX-9 ${formatMoney(sum('municipal-expenditure'))}. Both are sums of official schedule totals and exclude depreciation and the revaluation-reserve transfer. Paisa has no connected Pune project, tender or contract data.`,records};}
 if(q.intent==='overview')return {answer:'Published Union Budget records',records:data.records.filter(r=>r.group==='overview'&&r.fiscalYear==='2026-27')};const records=data.records.filter(r=>r.metric===q.metric&&r.fiscalYear===q.fiscalYear&&r.valueType===q.valueType);if(!records.length)return {answer:NO_DATA,records:[]};const r=records[0];return {answer:`${r.label}: ${formatMoney(r.amountRupees)}. ${r.fiscalYear} ${r.valueType==='BE'?'Budget Estimate':r.valueType==='RE'?'Revised Estimate':'Actual'}. ${r.notes}`,records};}
