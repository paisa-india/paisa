import {test} from 'node:test';
import assert from 'node:assert/strict';
Object.assign(process.env,{NODE_ENV:'test'});
const {buildServer}=await import('../apps/api/server');
test('read-only API serves published financial data, provenance and explicit gaps',async()=>{const app=await buildServer();try{
 const overview=await app.inject('/api/v1/india/overview');assert.equal(overview.statusCode,200);assert.equal(overview.json().actualToDate.length,9);
 const source=await app.inject('/api/v1/provenance/money/bag1%3Atotal-expenditure%3A2026-27%3ABE');assert.equal(source.statusCode,200);assert.equal(source.json().record.amountRupees,'53473150000000');
 const rev=await app.inject('/api/v1/revenue?q=GST');assert.equal(rev.json().records.length,1);
 const projects=(await app.inject('/api/v1/projects?state=maharashtra&delayed=1&pageSize=3')).json();assert.equal(projects.total,119);assert.ok(projects.items.every((p:{delayMonths:number;geographyIds:string[]})=>p.delayMonths>0&&p.geographyIds.includes('maharashtra')));
 for(const endpoint of ['tenders']){const r=await app.inject('/api/v1/'+endpoint);assert.deepEqual(r.json().records,[]);assert.equal(r.json().coverage,'not-connected');}
 const contracts=(await app.inject('/api/v1/contracts?single=1&pageSize=5')).json();assert.equal(contracts.total,243);assert.ok(contracts.items.every((c:{bidders:number})=>c.bidders===1));
 const list=(await app.inject('/api/v1/contractors?pageSize=3')).json();assert.equal(list.total,2912);
 const profile=(await app.inject('/api/v1/contractors/'+encodeURIComponent(list.items[0].id))).json();assert.equal(profile.contracts.length,profile.contractor.contracts);
 assert.equal((await app.inject('/api/v1/contractors/does-not-exist')).statusCode,404);
 const signals=(await app.inject('/api/v1/signals')).json();assert.equal(signals.counts['low-bids'],243);assert.equal(signals.counts['cost-change'],242);assert.equal(signals.counts['progress-gap'],11);assert.ok(signals.records.every((x:{disclaimer:string})=>x.disclaimer.includes('does not establish wrongdoing')));
 assert.equal((await app.inject({method:'POST',url:'/api/v1/revenue',payload:{sql:'DROP TABLE records'}})).statusCode,404);
 assert.equal((await app.inject('/api/v1/sources/missing')).statusCode,404);
 const pmc=await app.inject('/api/v1/municipal?geography=pmc');assert.equal(pmc.json().records.length,18);assert.equal((await app.inject('/api/v1/municipal?geography=pune-rural')).json().coverage,'not-connected');
 assert.equal((await app.inject('/api/v1/states?fy=2025-26&state=maharashtra')).json().records.length,9);
 assert.ok((await app.inject('/api/v1/status')).json().connectors.some((c:{id:string})=>c.id==='pmc-accounts'));
 }finally{await app.close();}});
test('API enforces a request rate limit',async()=>{const app=await buildServer();try{for(let i=0;i<90;i++)assert.equal((await app.inject('/api/v1/signals')).statusCode,200);assert.equal((await app.inject('/api/v1/signals')).statusCode,429);}finally{await app.close();}});
