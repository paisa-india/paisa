'use client';
/** Base path when hosted under a sub-path (GitHub Pages project sites, e.g. /paisa). */
export const BASE=process.env.NEXT_PUBLIC_BASE_PATH??'';
export const asset=(p:string)=>`${BASE}${p}`;
const cache=new Map<string,Promise<unknown>>();
/** Fetches a static JSON file once per page session. */
export function loadJson<T>(name:string):Promise<T>{
 if(!cache.has(name))cache.set(name,fetch(asset(`/data/${name}`)).then(r=>{if(!r.ok)throw new Error(`${name}: HTTP ${r.status}`);return r.json();}).catch(e=>{cache.delete(name);throw e;}));
 return cache.get(name) as Promise<T>;
}
