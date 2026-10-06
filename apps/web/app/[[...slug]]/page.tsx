import {notFound} from 'next/navigation';
import {readDataset,readRunSummary} from '../../../../packages/db/repository';
import type {Dataset,ShareRecord} from '../../../../packages/schema/index';
import Paisa from '../../components/Paisa';
const pages=['home','explore','my-tax','projects','contracts','contractors','schemes','signals','ask','sources','about'];
// Every page is pre-built at build time (static export for GitHub Pages); data changes trigger a rebuild.
export const dynamicParams=false;
export function generateStaticParams(){return pages.map(p=>({slug:p==='home'?[]:[p]}));}
/** Each page carries only the data it shows, so pages stay small on slow connections. */
function pageData(d:Dataset,page:string):Dataset{
 const sharesBySource:Record<string,number>={};for(const s of d.shares??[])sharesBySource[s.sourceId]=(sharesBySource[s.sourceId]??0)+1;
 const map=page==='projects'||page==='explore';
 // The map needs RBI state shares, but only the fields it displays.
 const shares=map?(d.shares??[]).map(s=>({geographyId:s.geographyId,metric:s.metric,fiscalYear:s.fiscalYear,valueType:s.valueType,tenthsOfPercentGsdp:s.tenthsOfPercentGsdp,cell:s.cell,sourceId:s.sourceId}) as ShareRecord):[];
 return {...d,shares,sharesBySource,validations:page==='sources'?d.validations:[]};
}
export default async function Page({params}:{params:Promise<{slug?:string[]}>}){const {slug=[]}=await params;const page=slug[0]??'home';if(slug.length>1||!pages.includes(page))notFound();return <Paisa dataset={pageData(await readDataset(),page)} page={page} runSummary={page==='sources'?await readRunSummary():null}/>;}
