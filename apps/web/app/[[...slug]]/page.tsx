import {notFound} from 'next/navigation';
import {readDataset,readRunSummary} from '../../../../packages/db/repository';
import type {Dataset,ShareRecord} from '../../../../packages/schema/index';
import type {Metadata} from 'next';
import Paisa from '../../components/Paisa';
import {absolute} from '../../lib/site';
const pages=['home','explore','my-tax','projects','contracts','contractors','schemes','signals','ask','sources','about'];
// Every page is pre-built at build time (static export for GitHub Pages); data changes trigger a rebuild.
export const dynamicParams=false;
export function generateStaticParams(){return pages.map(p=>({slug:p==='home'?[]:[p]}));}
/** What each page is about, in the words people search with. */
const META:Record<string,[string,string]>={
 home:['PAISA: follow India’s public money','Where India’s public money comes from and where it goes: the Union budget, state finances, 4,000+ cities’ accounts, central projects and contracts. Every number links to its official source.'],
 explore:['Union budget explained: where the money comes from and goes','India’s Union budget in plain words: receipts, spending by purpose, budget estimates and actuals, with the official documents behind every figure.'],
 'my-tax':['Where does my tax go? Union spending per ₹100','See how an amount would split if it followed the Union government’s spending: interest, defence, subsidies, states and more. A proportional illustration, worked out on your device.'],
 projects:['Map of public money: states, cities and central projects','Zoom into any state or city in India to see where its money comes from and goes, and which central projects are late or over budget.'],
 contracts:['Assam government contract awards, 2019–2023','Search 5,700+ Assam government contract awards by work, place, department or supplier, with bids, estimates and the official record.'],
 contractors:['Who won Assam government contracts','Suppliers named in Assam government contract awards: how many contracts, from which departments, and the total awarded value.'],
 schemes:['Government schemes and benefits','What PAISA knows about central government schemes and benefits, with official sources.'],
 signals:['Signals: cost overruns, delays and single-bid contracts','Automated observations from official data: central projects costing 25%+ more than approved, money spent ahead of work, single-bid awards and supplier concentration. Not findings of wrongdoing.'],
 ask:['Ask about the Union budget','Ask simple questions about India’s Union budget and get answers that cite the official figures.'],
 sources:['Data sources and how fresh they are','Every source PAISA uses: the official document, when it was last verified, the period it covers, and the checks every figure passes.'],
 about:['About PAISA','PAISA is an independent, open-source, politically neutral project that makes India’s public money understandable, with every number traceable to its source.'],
};
export async function generateMetadata({params}:{params:Promise<{slug?:string[]}>}):Promise<Metadata>{
 const {slug=[]}=await params;const page=slug[0]??'home';const [title,description]=META[page]??META.home;const url=absolute(page==='home'?'/':`/${page}/`);
 return {title:page==='home'?{absolute:title}:title,description,alternates:{canonical:url},openGraph:{title,description,url}};
}
/** Each page carries only the data it shows, so pages stay small on slow connections. */
function pageData(d:Dataset,page:string):Dataset{
 const sharesBySource:Record<string,number>={};for(const s of d.shares??[])sharesBySource[s.sourceId]=(sharesBySource[s.sourceId]??0)+1;
 const map=page==='projects'||page==='explore';
 // The map needs RBI state shares, but only the fields it displays.
 const shares=map?(d.shares??[]).map(s=>({geographyId:s.geographyId,metric:s.metric,fiscalYear:s.fiscalYear,valueType:s.valueType,tenthsOfPercentGsdp:s.tenthsOfPercentGsdp,cell:s.cell,sourceId:s.sourceId}) as ShareRecord):[];
 return {...d,shares,sharesBySource,validations:page==='sources'?d.validations:[]};
}
export default async function Page({params}:{params:Promise<{slug?:string[]}>}){const {slug=[]}=await params;const page=slug[0]??'home';if(slug.length>1||!pages.includes(page))notFound();return <Paisa dataset={pageData(await readDataset(),page)} page={page} runSummary={page==='sources'?await readRunSummary():null}/>;}
