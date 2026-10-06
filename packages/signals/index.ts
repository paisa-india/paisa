import {SIGNAL_DISCLAIMER} from '../schema/index';
export type Evidence={source:string;period:string;generatedAt:string;comparable:boolean;fixture?:boolean};
export type Signal={rule:string;inputs:Record<string,string|number>;formula:string;comparisonPeriod:string;source:string;generatedAt:string;explanation:string;limitations:string;disclaimer:string;fixture:boolean};
export type SignalInput=Evidence & (
 {kind:'progress-gap';financialPct:number;physicalPct:number}|
 {kind:'cost-change';originalRupees:string;currentRupees:string;originalType:'SANCTIONED'|'AWARDED_VALUE';currentType:'SANCTIONED'|'AWARDED_VALUE'}|
 {kind:'low-utilisation';actualRupees:string;budgetRupees:string;elapsedMonths:number;expectedSeasonalPct:number|null;baselineSource:string|null;budgetType:'BE'|'RE'}|
 {kind:'low-bids';bidCount:number;qualifiedBidCount:number|null}|
 {kind:'concentration';supplierRupees:string;totalRupees:string;contractCount:number;comparisonSet:string}
);
export const defaultThresholds={financial:75,physical:50,costChange:25,utilisationGap:20,maxBids:1,concentration:60,minContracts:5};
export function evaluate(input:SignalInput,thresholds=defaultThresholds):Signal|null{
 if(!input.comparable||!input.source||!input.period||Number.isNaN(Date.parse(input.generatedAt)))return null;
 let trigger=false,formula='',explanation='',limitations='Inputs must cover the same entity, period and accounting basis.';
 const inputs:Record<string,string|number>={};
 const money=(s:string)=>{if(!/^\d+$/.test(s))throw new Error('Invalid rupee amount');return BigInt(s);};
 switch(input.kind){
 case 'progress-gap':{
  const {financialPct:f,physicalPct:p}=input;if(![f,p].every(x=>Number.isFinite(x)&&x>=0&&x<=100))return null;
  trigger=f>=thresholds.financial&&p<=thresholds.physical;Object.assign(inputs,{financialPct:f,physicalPct:p,gapPercentagePoints:f-p,financialThreshold:thresholds.financial,physicalThreshold:thresholds.physical});formula='financial utilisation − physical completion (percentage points)';explanation='Financial utilisation is ahead of reported physical completion.';limitations+=' Advance payments and reporting lags can explain differences.';break;
 }
 case 'cost-change':{
  if(input.originalType!==input.currentType)return null;const o=money(input.originalRupees),c=money(input.currentRupees);if(o===0n)return null;
  trigger=(c-o)*100n>=o*BigInt(thresholds.costChange);Object.assign(inputs,{originalRupees:o.toString(),currentRupees:c.toString(),valueType:input.currentType,thresholdPct:thresholds.costChange});formula='(current − original) / original × 100';explanation='The comparable approved or awarded value increased above the configured threshold.';limitations+=' Scope changes and inflation may explain the change.';break;
 }
 case 'low-utilisation':{
  if(input.elapsedMonths<6||input.elapsedMonths>12||input.expectedSeasonalPct===null||!input.baselineSource||input.expectedSeasonalPct<0||input.expectedSeasonalPct>100)return null;
  const a=money(input.actualRupees),b=money(input.budgetRupees);if(b===0n)return null;
  const pct=Number(a*10000n/b)/100;trigger=input.expectedSeasonalPct-pct>=thresholds.utilisationGap;
  Object.assign(inputs,{actualRupees:a.toString(),budgetRupees:b.toString(),budgetType:input.budgetType,elapsedMonths:input.elapsedMonths,expectedSeasonalPct:input.expectedSeasonalPct,baselineSource:input.baselineSource,thresholdGapPct:thresholds.utilisationGap});formula='seasonal expected utilisation − (actual expenditure / selected estimate × 100)';explanation='Expenditure is below the supplied seasonal baseline.';limitations+=' Requires a sourced seasonal baseline; estimates are not expenditure.';break;
 }
 case 'low-bids':{
  if(!Number.isInteger(input.bidCount)||input.bidCount<1)return null;trigger=input.bidCount<=thresholds.maxBids;Object.assign(inputs,{bidCount:input.bidCount,qualifiedBidCount:input.qualifiedBidCount??'Not publicly available',threshold:thresholds.maxBids});formula='published bid count ≤ configured threshold';explanation='The published tender record reports limited competition.';limitations+=' A single bid does not establish a procurement irregularity.';break;
 }
 case 'concentration':{
  const s=money(input.supplierRupees),t=money(input.totalRupees);if(t===0n||s>t||!input.comparisonSet||input.contractCount<thresholds.minContracts)return null;
  trigger=s*100n>=t*BigInt(thresholds.concentration);Object.assign(inputs,{supplierAwardedRupees:s.toString(),comparisonAwardedRupees:t.toString(),contractCount:input.contractCount,comparisonSet:input.comparisonSet,thresholdPct:thresholds.concentration});formula='supplier awarded value / awarded value in comparison set × 100';explanation='High supplier concentration relative to the selected comparison set.';limitations+=' Award values are not actual payments. Incomplete award coverage can distort this share.';break;
 }}
 return trigger?{rule:input.kind,inputs,formula,comparisonPeriod:input.period,source:input.source,generatedAt:input.generatedAt,explanation,limitations,disclaimer:SIGNAL_DISCLAIMER,fixture:!!input.fixture}:null;
}
export function demonstrationSignals(){const e={source:'Synthetic fixture — no real project, authority or supplier',period:'Illustrative full-year comparison',generatedAt:'2026-10-05T00:00:00.000Z',comparable:true,fixture:true};return [
 evaluate({...e,kind:'progress-gap',financialPct:82,physicalPct:43}),
 evaluate({...e,kind:'cost-change',originalRupees:'100000000',currentRupees:'130000000',originalType:'SANCTIONED',currentType:'SANCTIONED'}),
 evaluate({...e,kind:'low-utilisation',actualRupees:'20000000',budgetRupees:'100000000',elapsedMonths:9,expectedSeasonalPct:65,baselineSource:'Synthetic seasonal baseline',budgetType:'RE'}),
 evaluate({...e,kind:'low-bids',bidCount:1,qualifiedBidCount:1}),
 evaluate({...e,kind:'concentration',supplierRupees:'70000000',totalRupees:'100000000',contractCount:10,comparisonSet:'Fictional department / roads / fictional district / full fiscal year'})
 ].filter((x):x is Signal=>x!==null);}
