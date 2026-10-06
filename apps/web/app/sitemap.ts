import type {MetadataRoute} from 'next';
import {geographies} from '../../../packages/schema/index';
import {readDataset} from '../../../packages/db/repository';
import {loadCities,hasAccounts} from '../lib/places-data';
import {absolute} from '../lib/site';
// Written once at build time (static export).
export const dynamic='force-static';
/** Every page search engines should know about, dated by when its data last changed. */
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const [d,{cities,source}]=await Promise.all([readDataset(),loadCities()]);const published=new Date(d.publishedAt),citiesDate=new Date(source.retrievedAt);
 const main=['/','/projects/','/explore/','/my-tax/','/places/','/contracts/','/contractors/','/signals/','/sources/','/about/'];
 return [...main.map((p,i)=>({url:absolute(p),lastModified:published,changeFrequency:'weekly' as const,priority:i===0?1:0.8})),
  ...geographies.filter(g=>g.parentId==='india').map(g=>({url:absolute(`/places/${g.id}/`),lastModified:published,changeFrequency:'monthly' as const,priority:0.7})),
  ...cities.filter(hasAccounts).map(c=>({url:absolute(`/places/${c.stateId}/${c.page}/`),lastModified:citiesDate,changeFrequency:'monthly' as const,priority:0.5}))];
}
