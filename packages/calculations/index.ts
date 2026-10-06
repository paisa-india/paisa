/** Exact decimal input: no binary floating point in money calculations. */
export function parseRupeesToPaise(input:string):bigint {
 if(!/^\d{1,12}(\.\d{1,2})?$/.test(input)) throw new Error('Enter a positive amount with up to two decimal places.');
 const [whole,fraction='']=input.split('.'); return BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
}
/** Largest-remainder allocation preserves every paise; stable input order breaks ties. */
export function apportion(total:bigint,weights:bigint[]):bigint[]{
 if(total<0n||weights.length===0||weights.some(w=>w<0n)) throw new Error('Invalid allocation');
 const denominator=weights.reduce((a,b)=>a+b,0n);if(denominator<=0n)throw new Error('No expenditure basis');
 const rows=weights.map((w,i)=>({i,q:total*w/denominator,r:total*w%denominator}));
 let remainder=total-rows.reduce((a,r)=>a+r.q,0n);
 for(const row of [...rows].sort((a,b)=>a.r===b.r?a.i-b.i:a.r>b.r?-1:1)){if(remainder===0n)break;row.q++;remainder--;}
 return rows.map(r=>r.q);
}
export function shareBasisPoints(n:bigint,d:bigint):number{return d>0n?Number(n*10000n/d):0;}
export function formatMoney(rupees:string,compact=true):string{
 const n=BigInt(rupees);const scale=n>=1000000000000n?1000000000000n:10000000n;
 if(compact&&n>=10000000n){const hundredths=(n*100n+scale/2n)/scale;return `₹${hundredths/100n}.${(hundredths%100n).toString().padStart(2,'0')} ${scale===1000000000000n?'lakh crore':'crore'}`;}
 return `₹${n.toLocaleString('en-IN')}`;
}
export function formatPaise(n:bigint):string{return `₹${(n/100n).toLocaleString('en-IN')}.${(n%100n).toString().padStart(2,'0')}`;}
