import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import type {Project,ProjectsFile,Source} from '../../packages/schema/index';
import {ProjectSchema} from '../../packages/schema/index';
export const parserVersion='mospi-projects/1.0.0';
export const MOSPI_SOURCE_ID='mospi-flash-report';
/** Reviewed, pinned report links. MoSPI's publication list API refuses scripts, so new months are added here (or found by the monthly URL probe). */
export const KNOWN_REPORTS=[
 {month:'2026-04',url:'https://www.mospi.gov.in/uploads/publications_reports/publications_reports1779688125413_332125c5-1fb9-4d23-87ca-dd89fc14cd15_Flash_Report_April_2026.pdf'}
];
// Sector names from the Harmonized Master List of Infrastructure (as printed in the report). An unknown sector stops the import.
const SECTORS=['Aviation & Aviation Infrastructure','Coal','Construction','Education','Electricity Generation','Energy Storage','Healthcare','Inland Waterways','Logistics Infrastructure','Metals & Mining','Oil & Gas','Railways','Real Estate','Roads & Highways','Shipping','Steel','Telecommunication','Tourism, Hospitality & Wellness','Transmission & Distribution','Urban Public Transport','Waste & Water','Water Resources'];
const MONTHS=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
// MoSPI state labels → Paisa geography ids. "PAN India" and "Offshore" map to no state. Unknown labels fail the import.
const STATES:Record<string,string>={'Andaman & Nicobar':'andaman-nicobar','Andhra Pradesh':'andhra-pradesh','Arunachal Pradesh':'arunachal-pradesh','Assam':'assam','Bihar':'bihar','Chandigarh':'chandigarh','Chhattisgarh':'chhattisgarh',
 'Dadra & Nagar Haveli and Daman & Diu':'dnh-dd','Delhi':'delhi','Goa':'goa','Gujarat':'gujarat','Haryana':'haryana','Himachal Pradesh':'himachal-pradesh','Jammu and Kashmir':'jammu-kashmir','Jharkhand':'jharkhand','Karnataka':'karnataka',
 'Kerala':'kerala','Ladakh':'ladakh','Lakshadweep':'lakshadweep','Madhya Pradesh':'madhya-pradesh','Maharashtra':'maharashtra','Manipur':'manipur','Meghalaya':'meghalaya','Mizoram':'mizoram','Nagaland':'nagaland','Odisha':'odisha',
 'Puducherry':'puducherry','Punjab':'punjab','Rajasthan':'rajasthan','Sikkim':'sikkim','Tamil Nadu':'tamil-nadu','Telangana':'telangana','Tripura':'tripura','Uttar Pradesh':'uttar-pradesh','Uttarakhand':'uttarakhand','West Bengal':'west-bengal'};
export function stateIds(label:string){
 if(label==='PAN India'||label==='Offshore')return [];
 const multi=/^Multi-States \((.+)\)$/.exec(label);const names=multi?multi[1].split(', '):[label];
 return names.map(n=>{const id=STATES[n];if(!id)throw new Error(`MoSPI: unknown state label "${n}"`);return id;});
}
/** Exact decimal crore → integer rupees (1 crore = 10,000,000). */
export function croreToRupees(raw:string){
 const m=/^(\d+)(?:\.(\d{1,7}))?$/.exec(raw);if(!m)throw new Error(`MoSPI: malformed amount "${raw}"`);
 return (BigInt(m[1])*10000000n+BigInt((m[2]??'').padEnd(7,'0'))).toString();
}
const month=(raw:string)=>{const m=/^(\d{2})\/(\d{4})$/.exec(raw);if(!m)return null;const mo=Number(m[1]);if(mo<1||mo>12)throw new Error(`MoSPI: bad month ${raw}`);return `${m[2]}-${m[1]}`;};
const monthsBetween=(a:string,b:string)=>{const [y1,m1]=a.split('-').map(Number),[y2,m2]=b.split('-').map(Number);return (y2-y1)*12+(m2-m1);};
const FOOTER=/Project Assessment, Infrastructure Monitoring and Analytics for Nation-building \(PAIMANA\) Page \d+ For details visit: https:\/\/paimana-proj\.mospi\.gov\.in/g;
const T6_HEADER=/All Ongoing Projects [A-Z]+ \d{4} Sl\.No Project Name \(Agency\) \(Project Code\) \(Legacy OCMS Code\) \(PMGID\) State Date of Approval \(Start Date\) MM\/YYYY Orignal\/Target DoC \(Revised DoC\) MM\/YYYY Orignal Cost Revised Cost in Rs\. Crore Cumulative Expenditure in Rs\. Crore Physical Progress \(%\)/g;
const D='(\\d{2}/\\d{4}|-|NA)',N='(\\d+(?:\\.\\d+)?|-)';
const ROW=new RegExp(`\\((\\d{4,7})\\) \\(([A-Z0-9-]+|-)\\) \\((\\d+|-)\\) (.+?) ${D} \\(${D}\\) ${D} \\(${D}\\) ${N} \\(${N}\\) ${N} ${N}(?= |$)`,'g');
const TOTAL=/Total \((\d+)\) (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)/;
type Check={rule:string;passed:boolean;differenceRupees:string;toleranceRupees:string};
/** Splits "Name (Agency [X])" at the last balanced parenthesis group. */
function nameAgency(s:string){
 if(!s.endsWith(')'))return {name:s,agency:null};let depth=0;
 for(let i=s.length-1;i>=0;i--){if(s[i]===')')depth++;else if(s[i]==='('){depth--;if(depth===0)return {name:s.slice(0,i).trim(),agency:s.slice(i+1,-1).trim()};}}
 return {name:s,agency:null};
}
export function parsePages(pages:string[],source:Source):Omit<ProjectsFile,'status'|'publishedAt'>{
 const text=pages.map(p=>p.replace(/\s+/g,' ').trim());
 const cover=/(\d+) ([A-Z]+) (\d{4}) Scan the QR code to access the PAIMANA Portal/.exec(text[0]??'');
 if(!cover||!MONTHS.includes(cover[2]))throw new Error('MoSPI: not a PAIMANA Flash Report (cover page changed)');
 const reportMonth=`${cover[3]}-${String(MONTHS.indexOf(cover[2])+1).padStart(2,'0')}`;
 // Table 1 gives official per-ministry/sector totals used to reconcile the project rows.
 const t1=text.filter(p=>p.startsWith('Ministry-wise Ongoing Projects')).join(' ').replace(FOOTER,' ').replace(/\s+/g,' ');
 const t1Body=t1.replace(/Total \d+ [\d,]+\.?\d* [\d,]+\.?\d*/g,' | ');
 const ministries=new Set<string>();const expected:{ministry:string;sector:string;count:number;original:number;revised:number;expenditure:number}[]=[];let currentMinistry='';
 for(const m of t1Body.matchAll(/([^\d|]+?) (\d+) (\d+(?:\.\d+)?) ([\d.]+(?:e\+\d+)?) ([\d.]+(?:e\+\d+)?)(?= |$)/g)){
  const label=m[1].replace(/^.*?Physical Progress.*$/,'').replace(/^Ministry-wise Ongoing Projects [A-Z]+ \d{4} Sl\.No Allocated To Sector Project Count Original Cost \(Latest Revised Cost\) in Rs\. Crore Cumulative Expenditure in Rs\. Crore/,'').trim();
  let sector=label;
  if(/^(Ministry|Department)\b/.test(label)){const sec=SECTORS.filter(x=>label.endsWith(' '+x)).sort((a,b)=>b.length-a.length)[0];if(!sec)throw new Error(`MoSPI: unknown sector in "${label}"`);currentMinistry=label.slice(0,-sec.length-1).trim();sector=sec;}
  else if(!SECTORS.includes(sector))throw new Error(`MoSPI: unknown sector "${sector}"`);
  ministries.add(currentMinistry);expected.push({ministry:currentMinistry,sector,count:Number(m[2]),original:Number(m[3]),revised:Number(m[4]),expenditure:Number(m[5])});
 }
 if(ministries.size<10)throw new Error('MoSPI: Table 1 (ministry-wise) not found or changed');
 const grand=/Total (\d+) ([\d,]+\.\d+) ([\d,]+\.\d+) \*{4}/.exec(t1);if(!grand)throw new Error('MoSPI: Table 1 grand total missing');
 const body=text.filter(p=>p.startsWith('All Ongoing Projects')).join(' ').replace(FOOTER,' ').replace(T6_HEADER,' ').replace(/\s+/g,' ');
 if(!body)throw new Error('MoSPI: Table 6 (all ongoing projects) not found');
 const projects:Project[]=[];const checks:Check[]=[];const groupTotals:{count:number;original:string;expenditure:string;rows:Project[]}[]=[];
 let last=0,expectSerial=1,ministry='',sector='',groupRows:Project[]=[];
 const closeGroup=(lead:string)=>{const t=TOTAL.exec(lead);if(t){groupTotals.push({count:Number(t[1]),original:croreToRupees(t[2]),expenditure:croreToRupees(t[3]),rows:groupRows});groupRows=[];}};
 for(const m of body.matchAll(ROW)){
  const lead=body.slice(last,m.index).trim();last=m.index!+m[0].length;
  const serial=[...lead.matchAll(/(?:^| )(\d+) (?=\S)/g)].find(x=>Number(x[1])===expectSerial);
  if(!serial)throw new Error(`MoSPI: could not find row ${expectSerial}`);
  const header=lead.slice(0,serial.index).trim();closeGroup(header);
  const heading=header.replace(TOTAL,'').trim();
  if(heading){const min=[...ministries].sort((a,b)=>b.length-a.length).find(x=>heading.startsWith(x+' '));if(min){ministry=min;sector=heading.slice(min.length).trim();}else sector=heading;if(!SECTORS.includes(sector))throw new Error(`MoSPI: unknown sector heading "${heading}"`);}
  if(!ministry||!sector)throw new Error(`MoSPI: no ministry/sector for row ${expectSerial}`);
  const {name,agency}=nameAgency(lead.slice(serial.index!+serial[0].length).trim());
  const [,code,ocms,pmgid,stateLabel,approval,start,origDoc,revDoc,orig,rev,exp,phys]=m;
  const original=croreToRupees(orig),latest=rev==='-'?original:croreToRupees(rev),expenditure=exp==='-'?null:croreToRupees(exp);
  const o=month(origDoc),r=month(revDoc);
  const p=ProjectSchema.parse({id:`mospi:${code}`,code,ocmsCode:ocms==='-'?null:ocms,pmgId:pmgid==='-'?null:pmgid,serial:expectSerial,name,agency,ministry,sector,stateLabel,geographyIds:stateIds(stateLabel),
   approved:month(approval),started:month(start),originalCompletion:o,revisedCompletion:r,delayMonths:o&&r?monthsBetween(o,r):null,
   originalRupees:original,latestRupees:latest,expenditureRupees:expenditure,physicalProgress:phys==='-'?null:phys,rawRow:m[0].slice(0,400),reportMonth,sourceId:source.id});
  projects.push(p);groupRows.push(p);expectSerial++;
 }
 closeGroup(body.slice(last).trim());
 // Group totals printed under each ministry/sector block must match the rows above them.
 let groupFailures=0;
 for(const g of groupTotals){const o=g.rows.reduce((a,p)=>a+BigInt(p.originalRupees),0n),e=g.rows.reduce((a,p)=>a+BigInt(p.expenditureRupees??'0'),0n);const tol=BigInt(g.rows.length)*100000n;const d=o-BigInt(g.original),de=e-BigInt(g.expenditure);if(g.count!==g.rows.length||(d<0n?-d:d)>tol||(de<0n?-de:de)>tol)groupFailures++;}
 checks.push({rule:`MoSPI ${reportMonth}: ${groupTotals.length} printed group totals match their project rows (count, original cost, expenditure)`,passed:groupFailures===0&&groupTotals.reduce((a,g)=>a+g.rows.length,0)===projects.length,differenceRupees:String(groupFailures),toleranceRupees:'₹1 lakh per row'});
 // Table 1 reconciliation by ministry and sector (Table 1 rounds some values to 6 significant digits).
 let t1Failures=0;
 for(const x of expected){const rows=projects.filter(p=>p.ministry===x.ministry&&p.sector===x.sector);const cr=(f:(p:Project)=>string|null)=>rows.reduce((a,p)=>a+Number(BigInt(f(p)??'0')/100000n)/100,0);
  const near=(a:number,b:number)=>Math.abs(a-b)<=Math.max(1,Math.abs(b)*1e-5);
  if(rows.length!==x.count||!near(cr(p=>p.originalRupees),x.original)||!near(cr(p=>p.latestRupees),x.revised)||!near(cr(p=>p.expenditureRupees),x.expenditure))t1Failures++;}
 checks.push({rule:`MoSPI ${reportMonth}: project rows reconcile with Table 1 for ${expected.length} ministry/sector groups`,passed:t1Failures===0,differenceRupees:String(t1Failures),toleranceRupees:'₹1 crore or 0.001%'});
 const grandCount=Number(grand[1]);
 checks.push({rule:`MoSPI ${reportMonth}: ${projects.length} project rows vs ${grandCount} ongoing projects in Table 1`,passed:projects.length===grandCount,differenceRupees:String(grandCount-projects.length),toleranceRupees:'0'});
 if(new Set(projects.map(p=>p.id)).size!==projects.length)throw new Error('MoSPI: duplicate project codes');
 if(checks.some(c=>!c.passed))throw new Error('MoSPI reconciliation failed: '+JSON.stringify(checks.filter(c=>!c.passed)));
 return {source,reportMonth,parserVersion,projects,validations:checks};
}
export async function parseReport(raw:Uint8Array,source:Source){
 const doc=await getDocument({data:raw,verbosity:0}).promise;const pages:string[]=[];
 for(let i=1;i<=doc.numPages;i++){const c=await(await doc.getPage(i)).getTextContent();pages.push(c.items.map(it=>'str'in it?it.str:'').join(' '));}
 return parsePages(pages,source);
}
export function summariseProjects(file:ProjectsFile){
 const byState:Record<string,{projects:number;delayed:number;overCost:number}>={};
 for(const p of file.projects)for(const g of p.geographyIds){const s=byState[g]??={projects:0,delayed:0,overCost:0};s.projects++;if((p.delayMonths??0)>0)s.delayed++;if(BigInt(p.latestRupees)>BigInt(p.originalRupees))s.overCost++;}
 const sum=(f:(p:Project)=>string|null)=>file.projects.reduce((a,p)=>a+BigInt(f(p)??'0'),0n).toString();
 return {sourceId:file.source.id,reportMonth:file.reportMonth,projects:file.projects.length,delayed:file.projects.filter(p=>(p.delayMonths??0)>0).length,overCost:file.projects.filter(p=>BigInt(p.latestRupees)>BigInt(p.originalRupees)).length,
  originalRupees:sum(p=>p.originalRupees),latestRupees:sum(p=>p.latestRupees),expenditureRupees:sum(p=>p.expenditureRupees),byState};
}
