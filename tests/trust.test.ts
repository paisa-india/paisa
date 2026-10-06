import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fiscalYearOf} from '../packages/calculations/index';
import {contractSignals} from '../packages/signals/contracts';
import {queryContracts} from '../packages/query/browse';
import {buildStatus} from '../apps/api/service';
import {readContracts} from '../packages/db/repository';
import type {Contract,ContractsFile} from '../packages/schema/index';

test('fiscal years follow the Indian April–March year',()=>{
 assert.equal(fiscalYearOf('2021-04-01'),'2021-22');assert.equal(fiscalYearOf('2022-03-31'),'2021-22');
 assert.equal(fiscalYearOf('1999-12-01'),'1999-00');assert.equal(fiscalYearOf(null),null);assert.equal(fiscalYearOf('not a date'),null);
});

const award=(i:number,contractor:string,date:string,paise:string,buyer='Roads'):Contract=>({id:`c${i}`,ocid:`o${i}`,tenderId:`t${i}`,title:'Work',buyer,location:null,category:null,method:null,tenderPublished:date,
 estimatePaise:paise,awardPaise:paise,rawAward:'1',bidders:3,contractorId:contractor,contractorName:contractor.toUpperCase(),valueCheck:'plausible',geographyId:'assam',sourceId:'test'});
const file=(contracts:Contract[])=>({status:'PUBLISHED',publishedAt:'2026-01-01T00:00:00Z',source:{title:'Test',datasetVersion:'1'},contracts,contractors:[],excluded:[],validations:[]}) as unknown as ContractsFile;

test('supplier concentration compares awards within one department and one fiscal year',()=>{
 // FY 2021-22: "a" wins 5 of 6 equal awards (83%). FY 2022-23: "b" wins everything, but the set is too small to judge.
 const list=[...[1,2,3,4,5].map(i=>award(i,'a','2021-06-01','100000')),award(6,'z','2021-07-01','100000'),award(7,'b','2022-06-01','900000000'),award(8,'b','2022-07-01','900000000')];
 const signals=contractSignals(file(list)).filter(s=>s.rule==='concentration');
 assert.equal(signals.length,1);assert.equal(signals[0].subject.id,'a');assert.deepEqual(signals[0].set,{buyer:'Roads',fy:'2021-22'});
 assert.equal((signals[0].inputs as Record<string,unknown>).contractCount,6);
 // Pooling both years would have hidden "a" behind "b"'s large awards: years are never mixed.
 assert.ok(!signals.some(s=>s.subject.id==='b'));
});

test('the signal\'s comparison set can be listed exactly (same department, fiscal year, checked awards)',()=>{
 const list=[...[1,2,3,4,5].map(i=>award(i,'a','2021-06-01','100000')),award(6,'z','2021-07-01','100000'),award(7,'b','2022-06-01','900000000'),{...award(9,'c','2021-08-01','5'),valueCheck:'implausible' as const}];
 const r=queryContracts(file(list),new URLSearchParams('buyer=Roads&fy=2021-22&checked=1&pageSize=50'));
 assert.equal(r.total,6);assert.ok(r.items.every(c=>c.tenderPublished!.startsWith('2021')&&c.valueCheck==='plausible'));
});

test('published contract data never pools concentration across years',async()=>{
 const f=await readContracts();if(!f)return;
 for(const s of contractSignals(f).filter(x=>x.rule==='concentration')){assert.ok(s.set,'every concentration signal names its set');
  const listed=queryContracts(f,new URLSearchParams({buyer:s.set!.buyer,fy:s.set!.fy,checked:'1',pageSize:'100'}));
  assert.equal(listed.total,(s.inputs as Record<string,number>).contractCount,'the linked list is exactly the comparison set');}
});

test('connector status separates data period, last verification and update mode',async()=>{
 const s=await buildStatus(new Date('2026-10-06T00:00:00Z'));const by=Object.fromEntries(s.connectors.map(c=>[c.id,c]));
 for(const c of s.connectors){assert.ok(['ok','behind','failing','not-connected'].includes(c.state));if(c.state==='not-connected')assert.equal(c.lastVerified,null);}
 // A report six months old is shown as waiting for newer data, not as current.
 if(by['mospi-projects']?.period==='Report for 2026-04')assert.equal(by['mospi-projects'].state,'behind');
 assert.notEqual(by.cityfinance?.state,'not-connected','city accounts are connected');
 assert.equal(by.cag.state,'not-connected');
});
