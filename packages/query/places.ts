/** Page addresses for places. Pure, so the data export, the pages and the sitemap always agree. */
export const slugify=(s:string)=>s.normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'city';
/** A city's page slug: its official name, made unique within its state (a duplicate name gets the id's last 4 characters). */
export function citySlugs(cities:{id:string;name:string;stateId:string|null}[]){
 const count=new Map<string,number>();for(const c of cities)if(c.stateId){const k=`${c.stateId}/${slugify(c.name)}`;count.set(k,(count.get(k)??0)+1);}
 const out=new Map<string,string>();
 for(const c of cities){if(!c.stateId)continue;const s=slugify(c.name);out.set(c.id,(count.get(`${c.stateId}/${s}`)??0)>1?`${s}-${c.id.slice(-4)}`:s);}
 return out;
}
