/**
 * Validation reference only — never published as data.
 * The face Income & Expenditure statement in PMC's audited accounts is a scanned image (PDF pages 65 and 91) with no text layer.
 * These figures were transcribed from the rendered pages on 2026-10-05 and checked by arithmetic (see validatePmc).
 * A maintainer should independently re-check them against the original before the first public deployment.
 * A new fiscal year fails closed until its statement is reviewed and added here.
 */
export const reviewedStatements:Record<string,{pages:number[];lines:Record<string,string>;totalIncome:string;totalExpenses:string;surplus:string}>={
 '2024-25':{pages:[65,91],lines:{
  IN1:'57342187082',IN2:'26877697723',IN3:'659183775',IN4:'22742642033',IN5:'169109985',IN6:'6031207567',IN7:'4081306675',IN8:'271178488',IN9:'30626800',REVALUATION:'8245630438',
  EX1:'29745117018',EX2:'5081766724',EX3:'10661697170',EX4:'3630655316',EX5:'152047801',EX6:'40436318',EX7:'6467282567',EX8:'79610954',EX9:'23633821958',DEPRECIATION:'16996116750'
 },totalIncome:'126450770566',totalExpenses:'96488552575',surplus:'29962217991'}
};
