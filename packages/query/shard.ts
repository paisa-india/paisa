/** Stable bucket for splitting per-record detail files (same result in Node and the browser). */
export const DETAIL_SHARDS=32;
export function shardOf(id:string){let h=2166136261;for(let i=0;i<id.length;i++){h^=id.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0)%DETAIL_SHARDS;}
/** Compact contract list stored column by column (compresses far better than rows). check: 0 plausible | 1 unchecked | 2 implausible. */
export type ContractColumns={id:string[];title:string[];buyer:number[];location:(string|null)[];date:(string|null)[];estimate:(string|null)[];award:string[];bidders:(number|null)[];contractor:number[];check:(0|1|2)[]};
export const CHECKS=['plausible','unchecked','implausible'] as const;
