import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,cp,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {apportion,parseRupeesToPaise} from '../packages/calculations/index';
import {evaluate,demonstrationSignals} from '../packages/signals/index';
import {validateBudget} from '../packages/validation/index';
import {readDataset} from '../packages/db/repository';
import {sha256} from '../packages/provenance/index';
import {parsePdf,parsePages} from '../connectors/union-budget/index';
import {parseCga} from '../connectors/cga/index';
import {parsePmcPdf,parseRows,validatePmc,toRupees} from '../connectors/pmc-accounts/index';
import {parseStatement,validateShares,toTenths,RBI_ARTIFACTS} from '../connectors/rbi-state-finances/index';
import {readSheet} from '../connectors/rbi-state-finances/xlsx';
import {parseAssam,normaliseDate,toPaise,contractorKey} from '../connectors/assam-contracts/index';
import {contractSignals,projectSignals} from '../packages/signals/contracts';
import {parseReport,parsePages as parseMospiPages,croreToRupees,stateIds} from '../connectors/mospi-projects/index';
import type {ContractsFile,ProjectsFile} from '../packages/schema/index';
import {parseStatement as parseCityStatement,stateId as cityStateId,type CitiesFile} from '../connectors/cityfinance/index';
import {parseCities} from '../connectors/cityfinance/collect';
import {gunzipSync} from 'node:zlib';
import {lcc} from '../packages/geo/lcc';
import {executeQuery,localProvider} from '../apps/api/query';
import {QuerySchema,NO_DATA} from '../packages/schema/index';
import {ingest} from '../apps/workers/pipeline';
const data=await readDataset();
test('tax calculation preserves every paise, including tiny and large amounts',()=>{
 for(const input of ['0.01','1','100','1000','10000','100000','999999999999.99']){
 const total=parseRupeesToPaise(input);const weights=data.records.filter(r=>r.group==='expenditure'&&r.fiscalYear==='2026-27').map(r=>BigInt(r.amountRupees));
 const parts=apportion(total,weights);assert.equal(parts.reduce((a,b)=>a+b,0n),total);assert.ok(parts.every(p=>p>=0n));
 }
 assert.deepEqual(apportion(100n,[1n,1n,1n]),[34n,33n,33n]);
 for(const v of ['-1','NaN','1e3','1.001','Infinity','1000000000000'])assert.throws(()=>parseRupeesToPaise(v));
});
test('five reproducible rules; fixtures are explicitly synthetic',()=>{const first=demonstrationSignals();assert.equal(first.length,5);assert.deepEqual(first,demonstrationSignals());assert.ok(first.every(s=>s.fixture&&s.disclaimer.includes('does not establish wrongdoing')));});
const evidence={source:'fixture',period:'2026-27',generatedAt:'2026-10-05T00:00:00Z',comparable:true};
test('no false comparison between award and sanction',()=>assert.equal(evaluate({...evidence,kind:'cost-change',originalRupees:'100',currentRupees:'200',originalType:'SANCTIONED',currentType:'AWARDED_VALUE'}),null));
test('low utilisation needs a sourced seasonal baseline and mature reporting period',()=>{for(const [months,baseline,source]of [[2,70,'fixture'],[9,null,'fixture'],[9,70,null]] as const)assert.equal(evaluate({...evidence,kind:'low-utilisation',actualRupees:'10',budgetRupees:'100',elapsedMonths:months,expectedSeasonalPct:baseline,baselineSource:source,budgetType:'BE'}),null);});
test('signals reject missing evidence, zero denominators and invalid progress',()=>{
 assert.equal(evaluate({...evidence,comparable:false,kind:'low-bids',bidCount:1,qualifiedBidCount:1}),null);
 assert.equal(evaluate({...evidence,kind:'progress-gap',financialPct:NaN,physicalPct:20}),null);
 assert.equal(evaluate({...evidence,kind:'cost-change',originalRupees:'0',currentRupees:'200',originalType:'SANCTIONED',currentType:'SANCTIONED'}),null);
 assert.equal(evaluate({...evidence,kind:'concentration',supplierRupees:'99',totalRupees:'100',contractCount:2,comparisonSet:'tiny set'}),null);
});
test('published budget reconciles and corrupted totals fail closed',()=>{
 const annual=data.records.filter(r=>r.sourceId.startsWith('bag'));assert.equal(validateBudget(annual).length,16);
 const changed=structuredClone(annual);changed.find(r=>r.metric==='total-expenditure')!.amountRupees='1';assert.throws(()=>validateBudget(changed),/Reconciliation failed/);
});
test('all original snapshots match SHA-256 and reproduce published records',async()=>{
 for(const source of data.sources){const raw=await readFile(source.path);assert.equal(sha256(raw),source.sha256);if(['assam-ocds-civicdatalab','mospi-flash-report','cityfinance-ulb-accounts'].includes(source.id))continue;// reproduced in its own test below
 const rbi=RBI_ARTIFACTS.find(a=>a.id===source.id);if(rbi){assert.deepEqual(parseStatement(new Uint8Array(raw),source,rbi.statement),data.shares!.filter(r=>r.sourceId===source.id));continue;}const parsed=source.id==='cga'?parseCga(raw,source):source.id.startsWith('pmc-')?await parsePmcPdf(new Uint8Array(raw),source):await parsePdf(new Uint8Array(raw),source);assert.deepEqual(parsed,data.records.filter(r=>r.sourceId===source.id));}
 assert.equal(data.records.length,211);assert.equal(data.records.find(r=>r.id==='bag1:total-expenditure:2026-27:BE')!.rawValue,'5347315');assert.equal(data.records.find(r=>r.id==='bag6:education:2026-27:BE')!.rawValue,'139289');assert.equal(data.records.find(r=>r.id==='bag7:pmjay:2026-27:BE')!.rawValue,'9500');
});
test('unexpected fiscal year/schema is rejected',()=>assert.throws(()=>parsePages(['unrelated content'],data.sources[0]),/schema/));
test('query layer cannot manufacture a missing actual or execute SQL',async()=>{
 const absent=executeQuery(await localProvider.interpret('How much GST has India collected this year?'),data);assert.equal(absent.answer,NO_DATA);assert.deepEqual(absent.records,[]);
 const education=executeQuery(await localProvider.interpret('How much is budgeted for education?'),data);assert.equal(education.records[0].rawValue,'139289');
 assert.throws(()=>QuerySchema.parse({intent:'sql',sql:'select * from secrets'}));
 assert.equal((await localProvider.interpret('SELECT education; DROP TABLE records')).intent,'unavailable');
 assert.equal((await localProvider.interpret('education budget 2030-31')).intent,'unavailable');
});
test('failed ingestion retains the entire last verified publication and prepares an issue',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'paisa-failure-'));try{await cp('data',path.join(root,'data'),{recursive:true});const original=await readFile(path.join(root,'data/published.json'),'utf8');const meta=JSON.parse(await readFile(path.join(root,'data/snapshots/bag1.json'),'utf8'));meta.sha256='0'.repeat(64);await writeFile(path.join(root,'data/snapshots/bag1.json'),JSON.stringify(meta));await assert.rejects(()=>ingest(root),/integrity/);assert.equal(await readFile(path.join(root,'data/published.json'),'utf8'),original);const health=JSON.parse(await readFile(path.join(root,'data/health.json'),'utf8'));assert.equal(health.status,'degraded');assert.ok(health.lastSuccess);}finally{await rm(root,{recursive:true,force:true});}
});
test('PMC audited schedule totals reconcile exactly with the audited statement',()=>{
 const pmc=data.records.filter(r=>r.geographyId==='pmc');assert.equal(pmc.length,18);
 assert.equal(pmc.find(r=>r.metric==='property-water-tax')!.amountRupees,'57342187082');assert.equal(pmc.find(r=>r.metric==='establishment')!.sourcePage,111);
 assert.ok(pmc.every(r=>r.valueType==='ACTUAL'&&r.fiscalYear==='2024-25'&&r.period.includes('audited, accrual basis')));
 assert.equal(validatePmc(pmc,'2024-25').filter(c=>c.passed).length,21);
 const changed=structuredClone(pmc);changed[0].amountRupees=(BigInt(changed[0].amountRupees)+1n).toString();assert.throws(()=>validatePmc(changed,'2024-25'),/PMC reconciliation failed/);
 assert.throws(()=>validatePmc(pmc,'2025-26'),/No reviewed PMC statement/);
});
test('PMC parser fails closed on wrong year, missing or duplicated totals, and malformed amounts',()=>{
 const source=data.sources.find(s=>s.id==='pmc-afs-2024-25')!;
 const page=(code:string,label:string,amount:string)=>({text:'Pune Municipal Corporation For the year 2024-2025',rows:[{page:1,cells:[label,'-',amount,amount]},{page:1,cells:[code,'Page 1']}]});
 assert.throws(()=>parseRows([{text:'unrelated',rows:[]}],source,'2024-25'),/schema/);
 assert.throws(()=>parseRows([page('IN1','Total Property Tax & Water Tax','1,00,000')],source,'2024-25'),/IN2 total: expected 1 row, found 0/);
 assert.throws(()=>parseRows([page('IN1','Total Property Tax & Water Tax','1'),page('IN 2','Total : Local Body Tax/GST','1'),page('IN-2','Total : Local Body Tax/GST','2')],source,'2024-25'),/IN2 total: expected 1 row, found 2/);
 assert.equal(toRupees('(3,78,46,027)'),-37846027n);assert.equal(toRupees('-'),0n);
 for(const bad of ['24,98,166.20','12a','1,2,3'])assert.throws(()=>toRupees(bad),/malformed/);
});
test('Ask Paisa answers Pune from published PMC records only',async()=>{
 const pune=executeQuery(await localProvider.interpret('How much did Pune Municipal Corporation spend?'),data);assert.equal(pune.records.length,18);assert.match(pune.answer,/audited accounts 2024-25/);
 for(const q of ['Show Pune government projects','Pune budget 2026-27'])assert.equal(executeQuery(await localProvider.interpret(q),data).answer,NO_DATA);
});
test('RBI state shares: 31 states, exact cells, reconciled; tampering fails closed',async()=>{
 const shares=data.shares!;assert.equal(shares.length,1116);assert.equal(new Set(shares.map(r=>r.geographyId)).size,31);
 const mh=shares.find(r=>r.id==='rbi-sf-2025-26-st33:maharashtra:own-tax:2025-26:BE')!;assert.equal(mh.tenthsOfPercentGsdp,78);assert.equal(mh.cell,'P20');
 assert.equal(validateShares(shares).length,1);
 const broken=structuredClone(shares);broken.find(r=>r.id===mh.id)!.tenthsOfPercentGsdp=90;assert.throws(()=>validateShares(broken),/reconciliation failed/);
 assert.equal(toTenths('4.5999999999999996'),46);assert.equal(toTenths('–'),0);for(const bad of ['abc','-3','2000'])assert.throws(()=>toTenths(bad));
 const src=data.sources.find(s=>s.id==='rbi-sf-2025-26-st33')!;const raw=new Uint8Array(await readFile(src.path));
 assert.throws(()=>parseStatement(raw,src,'34'),/unexpected title/);assert.equal(readSheet(raw).get('B20'),'14. Maharashtra');
 assert.throws(()=>readSheet(new TextEncoder().encode('<html>bot challenge</html>')),/Not a ZIP/);
});
test('Assam contracts reproduce from the saved snapshot; values, dates and identities are conservative',async()=>{
 const file:ContractsFile=JSON.parse(await readFile('data/contracts.json','utf8'));const raw=new Uint8Array(await readFile(file.source.path));
 assert.equal(sha256(raw),file.source.sha256);const again=parseAssam(raw,file.source);assert.deepEqual(again.contracts,file.contracts);assert.deepEqual(again.contractors,file.contractors);
 assert.equal(file.contracts.length,5715);assert.ok(file.contracts.every(c=>/^\d+$/.test(c.awardPaise)));
 assert.equal(normaliseDate('2022-26-02 11:33'),'2022-02-26');assert.equal(normaliseDate('2022-02-26'),null);assert.equal(normaliseDate('NA'),null);
 assert.equal(toPaise(3831743.23),'383174323');assert.equal(toPaise(1e21),null);assert.equal(toPaise(1.005),null);assert.equal(toPaise(0),null);
 assert.equal(contractorKey(' Rajib  Roy '),contractorKey('RAJIB ROY'));assert.notEqual(contractorKey('ABC Construction'),contractorKey('ABC Constructions'));
 const sig=contractSignals(file);assert.equal(sig.filter(s=>s.rule==='low-bids').length,243);assert.ok(sig.every(s=>!s.fixture&&s.disclaimer.includes('does not establish wrongdoing')));
 // Unit-rate style awards are listed but never counted in totals.
 assert.ok(file.contractors.every(c=>BigInt(c.checkedTotalPaise)===file.contracts.filter(x=>x.contractorId===c.id&&x.valueCheck==='plausible').reduce((a,x)=>a+BigInt(x.awardPaise),0n)));
});
test('MoSPI projects reproduce from the saved report and reconcile with MoSPI\'s own totals',async()=>{
 const file:ProjectsFile=JSON.parse(await readFile('data/projects.json','utf8'));const raw=new Uint8Array(await readFile(file.source.path));assert.equal(sha256(raw),file.source.sha256);
 const again=await parseReport(raw,file.source);assert.deepEqual(again.projects,file.projects);assert.equal(file.projects.length,1981);assert.ok(again.validations.every(v=>v.passed));
 const total=(f:(p:typeof file.projects[number])=>string)=>file.projects.reduce((a,p)=>a+BigInt(f(p)),0n);
 // Headline figures printed on page 3 of the April 2026 report (₹ crore): original 37,12,662; revised 42,78,402; spent 20,36,107.
 assert.equal(total(p=>p.originalRupees)/10000000n,3712662n);assert.equal(total(p=>p.latestRupees)/10000000n,4278402n);assert.equal(total(p=>p.expenditureRupees??'0')/10000000n,2036107n);
 const g=file.projects.find(p=>p.code==='706724')!;assert.equal(g.delayMonths,15);assert.equal(g.latestRupees,'25200000000');assert.deepEqual(g.geographyIds,['assam']);
 assert.equal(croreToRupees('1712'),'17120000000');assert.equal(croreToRupees('0.01'),'100000');assert.throws(()=>croreToRupees('1.08112e+006'));
 assert.deepEqual(stateIds('Multi-States (Andhra Pradesh, Telangana)'),['andhra-pradesh','telangana']);assert.deepEqual(stateIds('PAN India'),[]);assert.throws(()=>stateIds('Atlantis'),/unknown state/);
 assert.throws(()=>parseMospiPages(['unrelated'],file.source),/not a PAIMANA Flash Report/);
 const s=projectSignals(file);assert.equal(s.filter(x=>x.rule==='cost-change').length,242);assert.ok(s.every(x=>!x.fixture&&x.disclaimer.includes('does not establish wrongdoing')));
});
test('cityfinance city accounts reproduce from the snapshot, add up exactly, and match PMC\'s audited statement',async()=>{
 const file:CitiesFile=JSON.parse(await readFile('data/cities.json','utf8'));const raw=new Uint8Array(await readFile(file.source.path));assert.equal(sha256(raw),file.source.sha256);
 const lines=gunzipSync(raw).toString('utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));assert.deepEqual(parseCities(lines,file.source).cities,file.cities);
 for(const c of file.cities)for(const y of Object.values(c.years)){assert.equal(Object.values(y.i).reduce((a,v)=>a+BigInt(v),0n),BigInt(y.ti));assert.equal(Object.values(y.e).reduce((a,v)=>a+BigInt(v),0n),BigInt(y.te));}
 // PMC's audited Income & Expenditure statement (PDF page 65, previous-year column = FY 2023-24) vs cityfinance's standardised figures.
 const pune=file.cities.find(c=>c.id==='5eb5844f76a3b61f40ba0694');
 if(pune?.years['2023-24']){assert.equal(pune.years['2023-24'].i['140'],'23543480458');assert.equal(pune.years['2023-24'].i['130'],'488344545');assert.equal(pune.years['2023-24'].i['150'],'735320961');}
 // A year whose items do not add up is rejected, and zero totals mean "no data".
 const rows=[{key:'totalIncome','202324_x':100},{lineItem:'Total Expenditure(B)','202324_x':50},{code:110,'202324_x':90},{code:210,'202324_x':50}];
 assert.deepEqual(parseCityStatement('x',rows).rejected,['2023-24']);
 assert.deepEqual(Object.keys(parseCityStatement('x',[{key:'totalIncome'},{lineItem:'Total Expenditure(B)'}]).years),[]);
 assert.throws(()=>parseCityStatement('x',[{code:110}]),/layout changed/);
 assert.equal(cityStateId('The Government of NCT of Delhi'),'delhi');assert.equal(cityStateId('Maharashtra'),'maharashtra');
 // Map projection: India's projection origin sits at (0,0); north is up.
 const o=lcc(22,82);assert.ok(Math.abs(o.x)<1e-6&&Math.abs(o.y)<1e-6);assert.ok(lcc(30,82).y>0);
});
