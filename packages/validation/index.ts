import {MoneyRecordSchema,type MoneyRecord} from '../schema/index';
export function validateBudget(records:MoneyRecord[]) {
 records.forEach(r=>MoneyRecordSchema.parse(r));
 if(new Set(records.map(r=>r.id)).size!==records.length)throw new Error('Duplicate record IDs');
 const checks:{rule:string;passed:boolean;differenceRupees:string;toleranceRupees:string}[]=[];
 for(const [fy,type] of [['2024-25','ACTUAL'],['2025-26','BE'],['2025-26','RE'],['2026-27','BE']]){
 const rows=records.filter(r=>r.fiscalYear===fy&&r.valueType===type);
 const get=(metric:string)=>{const r=rows.find(r=>r.metric===metric&&r.group==='overview');if(!r)throw new Error(`Missing ${metric}`);return BigInt(r.amountRupees);};
 const compare=(rule:string,actual:bigint,expected:bigint,tolerance=10000000n)=>{const diff=actual-expected;checks.push({rule:`${fy} ${type}: ${rule}`,passed:(diff<0n?-diff:diff)<=tolerance,differenceRupees:diff.toString(),toleranceRupees:tolerance.toString()});};
 compare('Revenue + capital expenditure = total',get('revenue-expenditure')+get('capital-expenditure'),get('total-expenditure'));
 compare('Net tax + non-tax = revenue receipts',get('net-tax')+get('non-tax'),get('revenue-receipts'));
 compare('Receipts including financing = expenditure',get('revenue-receipts')+get('loan-recovery')+get('other-receipts')+get('borrowing'),get('total-expenditure'),20000000n);
 compare('Major expenditure items = total',rows.filter(r=>r.group==='expenditure').reduce((a,r)=>a+BigInt(r.amountRupees),0n),get('total-expenditure'),50000000n);
 }
 if(checks.some(c=>!c.passed))throw new Error('Reconciliation failed: '+JSON.stringify(checks.filter(c=>!c.passed)));
 return checks;
}
