/**
 * Layout for the "every ₹100" tiles. Pure functions, so they can be tested without a browser.
 *
 * - Categories keep one colour and one position in the order everywhere (any city, any year, PMC or cityfinance),
 *   so people can follow a category as it grows or shrinks.
 * - Tiles keep their identity: when a year changes, a tile stays in its category if it can, and only the difference
 *   moves. That is what makes the regrouping readable instead of a full redraw.
 */
export const TILES=100;
type Cat={color:string;rank:number};
/** Equivalent categories in PMC's audited schedules and cityfinance's NMAM codes share a colour and a rank. */
const CATS:Record<string,Cat>={
 // Income
 'nmam-110':{color:'#24857b',rank:1},'property-water-tax':{color:'#24857b',rank:1},
 'nmam-120':{color:'#e9a956',rank:2},'lbt-gst':{color:'#e9a956',rank:2},
 'nmam-160':{color:'#778bc6',rank:3},'revenue-grants':{color:'#778bc6',rank:3},
 'nmam-140':{color:'#b585af',rank:4},'fees-user-charges':{color:'#b585af',rank:4},
 'nmam-130':{color:'#739c65',rank:5},'rental-income':{color:'#739c65',rank:5},
 'nmam-171':{color:'#82a9b4',rank:6},'interest-earned':{color:'#82a9b4',rank:6},'nmam-170':{color:'#5f8f9c',rank:7},
 'nmam-150':{color:'#d18766',rank:8},'sales-hire':{color:'#d18766',rank:8},
 'other-taxes':{color:'#4f9f8f',rank:9},'nmam-180':{color:'#a39b7c',rank:10},'other-income':{color:'#a39b7c',rank:10},'nmam-100':{color:'#bdb59a',rank:11},
 // Spending
 'nmam-210':{color:'#24857b',rank:21},'establishment':{color:'#24857b',rank:21},
 'nmam-230':{color:'#e9a956',rank:22},'operations-maintenance':{color:'#e9a956',rank:22},'repairs-assets':{color:'#d18766',rank:23},
 'nmam-220':{color:'#778bc6',rank:24},'administrative':{color:'#778bc6',rank:24},
 'nmam-240':{color:'#b585af',rank:25},'interest-finance':{color:'#b585af',rank:25},
 'nmam-260':{color:'#739c65',rank:26},'grants-subsidies':{color:'#739c65',rank:26},
 'nmam-250':{color:'#82a9b4',rank:27},'programme':{color:'#82a9b4',rank:27},
 'nmam-271':{color:'#a39b7c',rank:28},'miscellaneous':{color:'#a39b7c',rank:28},'nmam-200':{color:'#bdb59a',rank:29},
 // Bookkeeping entries (shown striped) always come last.
 'nmam-270':{color:'#c9a25f',rank:40},'provision-overdues':{color:'#c9a25f',rank:40},'nmam-272':{color:'#9c8f78',rank:41},
};
const spare=['#5d7f9a','#c27c94','#8d9b4f','#6aa39a'];
/** A category's fixed colour, or `fallback` for categories this list doesn't know (national and state figures). */
export const categoryColor=(metric:string,fallback=spare[0])=>CATS[metric]?.color??fallback;
export const spareColor=(i:number)=>spare[i%spare.length];
export const categoryRank=(metric:string)=>CATS[metric]?.rank??100;
/** Stable display order: by fixed rank, unknown categories last (largest first). */
export function orderCategories(rows:{metric:string;share:number}[]){return [...rows].sort((a,b)=>categoryRank(a.metric)-categoryRank(b.metric)||b.share-a.share).map(r=>r.metric);}
/**
 * Gives each of the 100 tiles a category. `counts` must add up to 100. Tiles already in a category stay there while it
 * still needs them (lowest tile numbers first); the rest move to categories that grew.
 */
export function assignTiles(previous:(string|null)[],counts:Map<string,number>,order:string[]):string[]{
 const total=[...counts.values()].reduce((a,b)=>a+b,0);if(total!==TILES)throw new Error(`tiles: counts add up to ${total}, not ${TILES}`);
 const next:(string|null)[]=Array.from({length:TILES},()=>null);const kept=new Map<string,number>();
 for(let i=0;i<TILES;i++){const c=previous[i];if(c&&(kept.get(c)??0)<(counts.get(c)??0)){next[i]=c;kept.set(c,(kept.get(c)??0)+1);}}
 const free=next.flatMap((c,i)=>c===null?[i]:[]);let f=0;
 for(const c of order)for(let n=kept.get(c)??0;n<(counts.get(c)??0);n++)next[free[f++]]=c;
 return next as string[];
}
/** Grid cell (0–99) for each tile: categories fill the grid in `order`, each one's tiles in tile order. */
export function placeTiles(assigned:(string|null)[],order:string[]):number[]{
 const cell=Array.from({length:TILES},(_,i)=>i);let next=0;
 for(const c of order)for(let i=0;i<TILES;i++)if(assigned[i]===c)cell[i]=next++;
 for(let i=0;i<TILES;i++)if(assigned[i]===null||!order.includes(assigned[i]!))cell[i]=next++;
 return cell;
}
