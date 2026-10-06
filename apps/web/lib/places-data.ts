/** Build-time data for the place pages (server only: reads the published files). */
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {dataDirectory} from '../../../packages/db/repository';
import {citySlugs} from '../../../packages/query/places';
import type {CitiesFile,City} from '../../../connectors/cityfinance/index';
export type PlaceCity=City&{page:string};
let cache:Promise<{source:CitiesFile['source'];cities:PlaceCity[]}>|null=null;
export function loadCities(){
 return cache??=readFile(path.join(dataDirectory(),'cities.json'),'utf8').then(text=>{const f=JSON.parse(text) as CitiesFile;const slugs=citySlugs(f.cities);
  return {source:f.source,cities:f.cities.filter(c=>c.stateId).map(c=>({...c,page:slugs.get(c.id)!}))};});
}
/** Only cities with published accounts get a page: a page without figures would say nothing useful. */
export const hasAccounts=(c:City)=>Object.keys(c.years).length>0;
